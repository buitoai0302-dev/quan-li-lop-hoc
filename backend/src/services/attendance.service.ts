import { ERROR_CODES, ROLES, SESSION_STATUS, VIETNAM_TIME_ZONE } from '../utils/constants';
import type { Pool, PoolClient } from 'pg';
import pool from '../db';
import { NotFoundError, ValidationError } from '../utils/errors';
import { assertTenantReferences } from './tenant-reference.service';
import { lockScheduleWrites } from './schedule-write.service';

export interface AttendanceRecord {
  student_id: string;
  status: string;
}

interface AttendanceActor {
  userId: string;
  role: string;
}

async function findAttendanceSession(
  db: Pool | PoolClient,
  tenantId: string,
  sessionId: string,
  actor: AttendanceActor,
  forWrite = false
) {
  const result = await db.query(
    `SELECT s.id, s.class_id, s.session_date, s.start_time, s.end_time, c.name AS class_name,
            t.settings AS tenant_settings,
            s.session_date = (CURRENT_TIMESTAMP AT TIME ZONE $6)::date AS is_today
     FROM schedule_sessions s
     JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
     JOIN tenants t ON t.id = s.tenant_id
     WHERE s.id = $1 AND s.tenant_id = $2
       AND (NOT $7::boolean OR s.status <> $8)
       AND ($3 <> $4 OR EXISTS (
         SELECT 1
         FROM teachers teacher
         JOIN users u ON u.tenant_id = teacher.tenant_id AND u.email = teacher.email
         WHERE teacher.id = s.teacher_id AND teacher.tenant_id = s.tenant_id
           AND teacher.is_deleted = false AND u.id = $5
       ))
     ${forWrite ? 'FOR UPDATE OF s' : ''}`,
    [
      sessionId,
      tenantId,
      actor.role,
      ROLES.TEACHER,
      actor.userId,
      VIETNAM_TIME_ZONE,
      forWrite,
      SESSION_STATUS.CANCELLED,
    ]
  );
  if (!result.rows.length) {
    throw new NotFoundError('Không tìm thấy buổi học', ERROR_CODES.SESSION_NOT_FOUND);
  }
  return result.rows[0];
}

export class AttendanceService {
  static async getAttendanceBySession(tenantId: string, sessionId: string, actor: AttendanceActor) {
    const { is_today: _isToday, ...session } = await findAttendanceSession(
      pool,
      tenantId,
      sessionId,
      actor
    );
    const { class_id, tenant_settings } = session;

    if (tenant_settings?.menu?.attendance === false) {
      return {
        success: false,
        error: 'FEATURE_DISABLED',
        message: 'Tính năng điểm danh chưa được kích hoạt cho trung tâm của bạn.',
      };
    }

    const attendanceRes = await pool.query(
      `SELECT 
        s.id as student_id, 
        s.full_name, 
        s.email,
        a.id as attendance_id,
        COALESCE(a.status, 'none') as status,
        a.created_at as marked_at
       FROM students s
       JOIN class_students cs ON s.id = cs.student_id AND cs.tenant_id = s.tenant_id
       LEFT JOIN attendance a ON s.id = a.student_id AND a.tenant_id = s.tenant_id AND a.session_id = $1
       WHERE cs.class_id = $2 AND s.tenant_id = $3 AND s.is_deleted = false
       ORDER BY s.full_name`,
      [sessionId, class_id, tenantId]
    );

    return {
      success: true,
      data: {
        session,
        attendance: attendanceRes.rows,
      },
    };
  }

  static async recordAttendance(
    tenantId: string,
    sessionId: string,
    records: AttendanceRecord[],
    actor: AttendanceActor
  ) {
    if (!records || !Array.isArray(records)) {
      throw new ValidationError('Dữ liệu điểm danh không hợp lệ', ERROR_CODES.INVALID_DATA);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockScheduleWrites(client, tenantId);
      const { class_id, is_today, tenant_settings } = await findAttendanceSession(
        client,
        tenantId,
        sessionId,
        actor,
        true
      );

      await assertTenantReferences(
        client,
        tenantId,
        'students',
        records.map((r) => r.student_id)
      );
      const enrolled = await client.query(
        `SELECT cs.student_id
         FROM class_students cs
         JOIN students s ON s.id = cs.student_id AND s.tenant_id = cs.tenant_id
         WHERE cs.class_id = $1 AND cs.tenant_id = $2 AND cs.student_id = ANY($3::uuid[])
           AND s.is_deleted = false
         FOR KEY SHARE OF cs`,
        [class_id, tenantId, records.map((r) => r.student_id)]
      );
      if (
        new Set(enrolled.rows.map((r) => r.student_id)).size !==
        new Set(records.map((r) => r.student_id.toLowerCase())).size
      ) {
        throw new ValidationError(
          'Học sinh chưa ghi danh vào lớp',
          ERROR_CODES.STUDENT_NOT_ENROLLED
        );
      }

      if (!is_today) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'SESSION_DATE_RESTRICTED',
          message: 'Chỉ có thể điểm danh cho các buổi học diễn ra trong ngày hôm nay.',
        };
      }

      if (tenant_settings?.menu?.attendance === false) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'FEATURE_DISABLED',
          message: 'Tính năng điểm danh chưa được kích hoạt cho trung tâm của bạn.',
        };
      }

      const results = [];
      for (const record of records) {
        const { student_id, status } = record;

        const queryRes = await client.query(
          `INSERT INTO attendance (tenant_id, session_id, student_id, status, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (session_id, student_id) 
           DO UPDATE SET 
              status = EXCLUDED.status, 
              updated_at = NOW()
           RETURNING *`,
          [tenantId, sessionId, student_id, status]
        );
        results.push(queryRes.rows[0]);
      }

      await client.query('COMMIT');
      return { success: true, count: results.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

import pool from '../db';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface AttendanceRecord {
  student_id: string;
  status: string;
}

export class AttendanceService {
  static async getAttendanceBySession(tenantId: string, sessionId: string) {
    const sessionRes = await pool.query(
      `SELECT s.id, s.class_id, s.session_date, s.start_time, s.end_time, c.name as class_name,
              t.settings as tenant_settings
       FROM schedule_sessions s
       JOIN classes c ON s.class_id = c.id
       JOIN tenants t ON s.tenant_id = t.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [sessionId, tenantId]
    );

    if (sessionRes.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy buổi học', 'SESSION_NOT_FOUND');
    }

    const { class_id, tenant_settings } = sessionRes.rows[0];

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
       JOIN class_students cs ON s.id = cs.student_id
       LEFT JOIN attendance a ON s.id = a.student_id AND a.session_id = $1
       WHERE cs.class_id = $2 AND s.tenant_id = $3 AND s.is_deleted = false
       ORDER BY s.full_name`,
      [sessionId, class_id, tenantId]
    );

    return {
      success: true,
      data: {
        session: sessionRes.rows[0],
        attendance: attendanceRes.rows,
      },
    };
  }

  static async recordAttendance(tenantId: string, sessionId: string, records: AttendanceRecord[]) {
    if (!records || !Array.isArray(records)) {
      throw new ValidationError('Dữ liệu điểm danh không hợp lệ', 'INVALID_DATA');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        `SELECT s.id, s.session_date, t.settings as tenant_settings 
         FROM schedule_sessions s
         JOIN tenants t ON s.tenant_id = t.id
         WHERE s.id = $1 AND s.tenant_id = $2`,
        [sessionId, tenantId]
      );

      if (sessionRes.rows.length === 0) {
        throw new NotFoundError('Không tìm thấy buổi học', 'SESSION_NOT_FOUND');
      }

      const { session_date, tenant_settings } = sessionRes.rows[0];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sessionDate = new Date(session_date);
      sessionDate.setHours(0, 0, 0, 0);

      if (sessionDate.getTime() !== today.getTime()) {
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

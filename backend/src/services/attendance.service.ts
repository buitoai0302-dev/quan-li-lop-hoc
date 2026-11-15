import type { Pool, PoolClient } from 'pg';
import pool from '../db';
import { ERROR_CODES, ROLES, SESSION_STATUS, VIETNAM_TIME_ZONE } from '../utils/constants';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { lockScheduleWrites } from './schedule-write.service';

export const ATTENDANCE_STATUS = {
  NONE: 'none',
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
} as const;
const MAX_ATTENDANCE_RECORDS = 1000;
export interface AttendanceRecord {
  student_id: string;
  status: string;
}
export interface AttendanceActor {
  userId: string;
  role: string;
}
export interface AttendanceOptions {
  expectedVersion?: number;
  reason?: string;
  confirmedStudentIds?: string[];
}

async function findAttendanceSession(
  db: Pool | PoolClient,
  tenantId: string,
  sessionId: string,
  actor: AttendanceActor,
  forWrite = false
) {
  if (
    ![ROLES.ADMIN, ROLES.STAFF, ROLES.SUPER_ADMIN, ROLES.TEACHER].some(
      (role) => role === actor.role
    )
  )
    throw new ForbiddenError();
  const { rows } = await db.query(
    `SELECT s.id, s.tenant_id, s.class_id, s.room_id, s.teacher_id, s.session_date::text,
            s.start_time, s.end_time, s.session_type, s.status, s.notes, s.attendance_version,
            c.name AS class_name, t.settings AS tenant_settings,
            (CURRENT_TIMESTAMP AT TIME ZONE $6)::date::text AS business_date
     FROM schedule_sessions s
     JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
     JOIN tenants t ON t.id = s.tenant_id
     WHERE s.id = $1 AND s.tenant_id = $2
       AND ($3 <> $4 OR EXISTS (
         SELECT 1 FROM teachers teacher
         JOIN users u ON u.tenant_id = teacher.tenant_id AND u.email = teacher.email
         WHERE teacher.id = s.teacher_id AND teacher.tenant_id = s.tenant_id
           AND teacher.is_deleted = false AND u.id = $5
       )) ${forWrite ? 'FOR UPDATE OF s' : ''}`,
    [sessionId, tenantId, actor.role, ROLES.TEACHER, actor.userId, VIETNAM_TIME_ZONE]
  );
  if (!rows.length)
    throw new NotFoundError('Không tìm thấy buổi học', ERROR_CODES.SESSION_NOT_FOUND);
  return rows[0];
}

function editingPolicy(
  session: {
    session_date: string;
    business_date: string;
    status: string;
    tenant_settings?: { menu?: { attendance?: boolean } };
  },
  actor: AttendanceActor
) {
  const isPast = session.session_date < session.business_date;
  const isFuture = session.session_date > session.business_date;
  const featureEnabled = session.tenant_settings?.menu?.attendance !== false;
  const editable =
    featureEnabled &&
    !isFuture &&
    session.status !== SESSION_STATUS.CANCELLED &&
    (!isPast || actor.role !== ROLES.TEACHER);
  return {
    editable,
    businessDate: session.business_date,
    isPast,
    isFuture,
    reasonRequired: isPast && editable,
    canConfirmStudents: isPast && editable,
  };
}

export class AttendanceService {
  static async getAttendanceBySession(tenantId: string, sessionId: string, actor: AttendanceActor) {
    // Repeatable read keeps the records and version from the same snapshot.
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const session = await findAttendanceSession(client, tenantId, sessionId, actor);
      if (session.tenant_settings?.menu?.attendance === false)
        throw new ForbiddenError('Tính năng chưa được bật', ERROR_CODES.FEATURE_DISABLED);
      const policy = editingPolicy(session, actor);
      const attendance = await client.query(
        `WITH roster AS (
           SELECT student_id FROM attendance_session_students WHERE tenant_id = $1 AND session_id = $2
           UNION SELECT student_id FROM attendance WHERE tenant_id = $1 AND session_id = $2
           UNION SELECT student_id FROM class_students WHERE tenant_id = $1 AND class_id = $3 AND $4::boolean
         )
         SELECT s.id AS student_id, s.full_name, s.email, a.id AS attendance_id,
                COALESCE(a.status, $5) AS status, a.updated_at AS marked_at
         FROM roster r JOIN students s ON s.id = r.student_id AND s.tenant_id = $1
         LEFT JOIN attendance a ON a.student_id = s.id AND a.tenant_id = $1 AND a.session_id = $2
         WHERE NOT s.is_deleted OR a.id IS NOT NULL
         ORDER BY s.full_name, s.id`,
        [tenantId, sessionId, session.class_id, !policy.isPast, ATTENDANCE_STATUS.NONE]
      );
      await client.query('COMMIT');
      const { tenant_settings: _settings, business_date: _date, ...publicSession } = session;
      return {
        success: true as const,
        data: {
          session: publicSession,
          attendance: attendance.rows,
          version: session.attendance_version as number,
          editingPolicy: policy,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async recordAttendance(
    tenantId: string,
    sessionId: string,
    records: AttendanceRecord[],
    actor: AttendanceActor,
    options: AttendanceOptions = {}
  ) {
    if (
      !Array.isArray(records) ||
      !records.length ||
      records.length > MAX_ATTENDANCE_RECORDS ||
      records.some(
        (record) =>
          ![
            ATTENDANCE_STATUS.PRESENT,
            ATTENDANCE_STATUS.ABSENT,
            ATTENDANCE_STATUS.LATE,
            ATTENDANCE_STATUS.EXCUSED,
          ].some((status) => status === record.status)
      ) ||
      new Set(records.map((record) => record.student_id.toLowerCase())).size !== records.length
    ) {
      throw new ValidationError('Dữ liệu điểm danh không hợp lệ', ERROR_CODES.INVALID_DATA);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockScheduleWrites(client, tenantId);
      const session = await findAttendanceSession(client, tenantId, sessionId, actor, true);
      const policy = editingPolicy(session, actor);
      if (session.tenant_settings?.menu?.attendance === false)
        throw new ForbiddenError('Tính năng chưa được bật', ERROR_CODES.FEATURE_DISABLED);
      if (!policy.editable)
        throw new ValidationError(
          'Không thể điểm danh buổi học này',
          ERROR_CODES.SESSION_DATE_RESTRICTED
        );
      if (
        (policy.isPast && options.expectedVersion === undefined) ||
        (options.expectedVersion !== undefined &&
          options.expectedVersion !== session.attendance_version)
      ) {
        throw new AppError(
          'Điểm danh đã thay đổi. Vui lòng tải lại để đối chiếu.',
          409,
          ERROR_CODES.ATTENDANCE_VERSION_CONFLICT
        );
      }
      const reason = options.reason?.trim() || null;
      if (policy.reasonRequired && !reason)
        throw new ValidationError(
          'Cần nhập lý do chỉnh sửa',
          ERROR_CODES.ATTENDANCE_REASON_REQUIRED
        );
      if (reason && reason.length > 1000)
        throw new ValidationError('Lý do quá dài', ERROR_CODES.INVALID_DATA);
      const confirmedIds = new Set(
        (options.confirmedStudentIds || []).map((id) => id.toLowerCase())
      );
      if (confirmedIds.size && !policy.canConfirmStudents) throw new ForbiddenError();
      const studentIds = records.map((record) => record.student_id.toLowerCase());
      if ([...confirmedIds].some((id) => !studentIds.includes(id)))
        throw new ValidationError(
          'Xác nhận không thuộc danh sách điểm danh',
          ERROR_CODES.INVALID_DATA
        );
      const eligible = await client.query(
        `SELECT s.id, a.status AS previous_status,
           (EXISTS (SELECT 1 FROM attendance_session_students r WHERE r.tenant_id = $1 AND r.session_id = $2 AND r.student_id = s.id)
            OR a.id IS NOT NULL
            OR ($4::boolean AND EXISTS (SELECT 1 FROM class_students cs WHERE cs.tenant_id = $1 AND cs.class_id = $3 AND cs.student_id = s.id))) AS known
         FROM students s LEFT JOIN attendance a ON a.student_id = s.id AND a.tenant_id = $1 AND a.session_id = $2
         WHERE s.tenant_id = $1 AND s.id = ANY($5::uuid[]) AND (NOT s.is_deleted OR a.id IS NOT NULL)`,
        [tenantId, sessionId, session.class_id, !policy.isPast, studentIds]
      );
      if (
        eligible.rows.length !== studentIds.length ||
        eligible.rows.some((row) => !row.known && !confirmedIds.has(row.id))
      ) {
        throw new ValidationError(
          'Học viên chưa được xác nhận cho buổi học',
          ERROR_CODES.STUDENT_NOT_ENROLLED
        );
      }
      if (!policy.isPast) {
        await client.query(
          `INSERT INTO attendance_session_students (tenant_id, session_id, student_id)
           SELECT cs.tenant_id, $2, cs.student_id FROM class_students cs
           JOIN students s ON s.id = cs.student_id AND s.tenant_id = cs.tenant_id
           WHERE cs.tenant_id = $1 AND cs.class_id = $3 AND NOT s.is_deleted ON CONFLICT DO NOTHING`,
          [tenantId, sessionId, session.class_id]
        );
      }
      const previous = new Map<string, { previous_status: string | null; known: boolean }>(
        eligible.rows.map((row) => [row.id, row])
      );
      const changes = records.filter(
        (record) => previous.get(record.student_id.toLowerCase())?.previous_status !== record.status
      );
      const version = session.attendance_version + (changes.length ? 1 : 0);
      for (const record of changes) {
        const studentId = record.student_id.toLowerCase();
        const before = previous.get(studentId)!;
        await client.query(
          `INSERT INTO attendance_session_students (tenant_id, session_id, student_id, confirmed)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [tenantId, sessionId, studentId, !before.known]
        );
        await client.query(
          `INSERT INTO attendance (tenant_id, session_id, student_id, status, updated_at) VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
           WHERE attendance.tenant_id = $1`,
          [tenantId, sessionId, studentId, record.status]
        );
        await client.query(
          `INSERT INTO attendance_audit (tenant_id, session_id, student_id, actor_id, before_status, after_status, reason, confirmed_addition, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            tenantId,
            sessionId,
            studentId,
            actor.userId,
            before.previous_status,
            record.status,
            reason,
            !before.known,
            version,
          ]
        );
      }
      if (changes.length)
        await client.query(
          'UPDATE schedule_sessions SET attendance_version = $3 WHERE tenant_id = $1 AND id = $2',
          [tenantId, sessionId, version]
        );
      await client.query('COMMIT');
      return { success: true as const, count: records.length, changed: changes.length, version };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getHistory(tenantId: string, sessionId: string, actor: AttendanceActor, offset = 0) {
    if (actor.role === ROLES.TEACHER) throw new ForbiddenError();
    await findAttendanceSession(pool, tenantId, sessionId, actor);
    const { rows } = await pool.query(
      `SELECT a.id, a.student_id, s.full_name, a.actor_id, u.full_name AS actor_name,
              a.before_status, a.after_status, a.reason, a.confirmed_addition, a.version, a.created_at
       FROM attendance_audit a JOIN students s ON s.id = a.student_id AND s.tenant_id = a.tenant_id
       JOIN users u ON u.id = a.actor_id AND (u.tenant_id = a.tenant_id OR u.role = $4)
       WHERE a.tenant_id = $1 AND a.session_id = $2 ORDER BY a.created_at DESC, a.id LIMIT 51 OFFSET $3`,
      [tenantId, sessionId, offset, ROLES.SUPER_ADMIN]
    );
    return { items: rows.slice(0, 50), hasMore: rows.length > 50 };
  }
}

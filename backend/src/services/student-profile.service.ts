import pool from '../db';
import { ERROR_CODES, ROLES, TUITION_STATUS } from '../utils/constants';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import type { StudentHistoryType } from '../utils/workflow';

interface StudentProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  parent_phone: string | null;
  date_of_birth: string | null;
  is_active: boolean;
  branch_name: string | null;
  class_count: number;
  attendance_count: number;
  outstanding_vnd: string;
  paid_vnd: string;
}
interface StudentHistoryItem {
  id: string;
  title: string | null;
  date: string;
  status?: string;
  end_date?: string;
  teacher_name?: string | null;
  branch_name?: string | null;
  session_id?: string;
  start_time?: string;
  end_time?: string;
  amount_vnd?: string;
  payment_method?: string;
  reference_code?: string | null;
  tuition_id?: string;
}
interface StudentHistoryPage {
  total: number;
  items: StudentHistoryItem[];
}

function assertManagement(role: string) {
  if (![ROLES.ADMIN, ROLES.STAFF, ROLES.SUPER_ADMIN].some((value) => value === role))
    throw new ForbiddenError();
}

const HISTORY_QUERIES: Record<StudentHistoryType, string> = {
  classes: `SELECT c.id, c.name AS title, cs.status, c.start_date::text AS date, c.end_date::text AS end_date,
      t.full_name AS teacher_name, b.name AS branch_name
    FROM class_students cs JOIN classes c ON c.id = cs.class_id AND c.tenant_id = cs.tenant_id
    LEFT JOIN teachers t ON t.id = c.teacher_id AND t.tenant_id = c.tenant_id
    LEFT JOIN branches b ON b.id = c.branch_id AND b.tenant_id = c.tenant_id
    WHERE cs.tenant_id = $1 AND cs.student_id = $2 AND NOT c.is_deleted`,
  attendance: `SELECT a.id, c.name AS title, a.status, s.session_date::text AS date,
      s.start_time, s.end_time, s.id AS session_id
    FROM attendance a JOIN schedule_sessions s ON s.id = a.session_id AND s.tenant_id = a.tenant_id
    JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
    WHERE a.tenant_id = $1 AND a.student_id = $2`,
  payments: `SELECT p.id, c.name AS title, p.payment_date::text AS date,
      p.amount_paid::text AS amount_vnd, p.payment_method, p.reference_code, p.tuition_id
    FROM payments p JOIN tuitions t ON t.id = p.tuition_id AND t.tenant_id = p.tenant_id
    LEFT JOIN classes c ON c.id = t.class_id AND c.tenant_id = t.tenant_id
    WHERE p.tenant_id = $1 AND t.student_id = $2`,
};

export class StudentProfileService {
  static async getProfile(tenantId: string, studentId: string, role: string) {
    assertManagement(role);
    const result = await pool.query<StudentProfile>(
      `SELECT s.id, s.full_name, s.email, s.phone, s.parent_phone, s.date_of_birth::text, s.is_active,
        b.name AS branch_name,
        (SELECT COUNT(*)::int FROM class_students cs JOIN classes c ON c.id = cs.class_id AND c.tenant_id = cs.tenant_id
          WHERE cs.tenant_id = s.tenant_id AND cs.student_id = s.id AND NOT c.is_deleted) AS class_count,
        (SELECT COUNT(*)::int FROM attendance a WHERE a.tenant_id = s.tenant_id AND a.student_id = s.id) AS attendance_count,
        (SELECT COALESCE(SUM(GREATEST(t.amount_due - COALESCE(p.paid, 0), 0)), 0)::text
         FROM tuitions t LEFT JOIN LATERAL (SELECT SUM(amount_paid) AS paid FROM payments WHERE tenant_id = t.tenant_id AND tuition_id = t.id) p ON true
         WHERE t.tenant_id = s.tenant_id AND t.student_id = s.id AND t.status <> $3) AS outstanding_vnd,
        (SELECT COALESCE(SUM(p.amount_paid), 0)::text FROM payments p JOIN tuitions t ON t.id = p.tuition_id AND t.tenant_id = p.tenant_id
         WHERE p.tenant_id = s.tenant_id AND t.student_id = s.id) AS paid_vnd
       FROM students s LEFT JOIN branches b ON b.id = s.branch_id AND b.tenant_id = s.tenant_id
       WHERE s.tenant_id = $1 AND s.id = $2 AND NOT s.is_deleted`,
      [tenantId, studentId, TUITION_STATUS.WAIVED]
    );
    if (!result.rows.length)
      throw new NotFoundError('Student not found', ERROR_CODES.STUDENT_NOT_FOUND);
    return result.rows[0];
  }

  static async getHistory(
    tenantId: string,
    studentId: string,
    role: string,
    options: { type: StudentHistoryType; limit: number; offset: number }
  ) {
    assertManagement(role);
    const exists = await pool.query(
      'SELECT id FROM students WHERE tenant_id = $1 AND id = $2 AND NOT is_deleted',
      [tenantId, studentId]
    );
    if (!exists.rows.length)
      throw new NotFoundError('Student not found', ERROR_CODES.STUDENT_NOT_FOUND);
    const result = await pool.query<StudentHistoryPage>(
      `WITH history AS (${HISTORY_QUERIES[options.type]})
       SELECT (SELECT COUNT(*)::int FROM history) AS total,
         COALESCE((SELECT json_agg(page) FROM (SELECT * FROM history ORDER BY date DESC, id DESC LIMIT $3 OFFSET $4) page), '[]'::json) AS items`,
      [tenantId, studentId, options.limit, options.offset]
    );
    return { ...result.rows[0], limit: options.limit, offset: options.offset };
  }
}

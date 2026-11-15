import pool from '../db';
import {
  ROLES,
  SESSION_STATUS,
  TUITION_STATUS,
  CLASS_STATUS,
  VIETNAM_TIME_ZONE,
} from '../utils/constants';
import { ForbiddenError } from '../utils/errors';
import { WORK_ITEM_TYPES, WORKFLOW_LOOKAHEAD_DAYS, type WorkItemType } from '../utils/workflow';

interface WorkItem {
  id: string;
  title: string;
  date: string | null;
  start_time?: string;
  end_time?: string;
  student_id?: string;
  class_id?: string;
  outstanding_vnd?: string;
  missing_teacher?: boolean;
  missing_sessions?: boolean;
}
interface WorkItemPage {
  items: WorkItem[];
  total: number;
}

// These are fixed SQL fragments, never built from request fields.
const WORK_ITEM_QUERIES: Record<WorkItemType, string> = {
  attendance: `SELECT s.id, c.name AS title, s.session_date::text AS date, s.start_time, s.end_time, s.class_id
    FROM schedule_sessions s
    JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id AND NOT c.is_deleted
    WHERE s.tenant_id = $1 AND s.session_date = (CURRENT_TIMESTAMP AT TIME ZONE $2)::date
      AND s.status <> $3
      AND ($4::uuid IS NULL OR EXISTS (
        SELECT 1 FROM teachers t JOIN users u ON u.tenant_id = t.tenant_id AND u.email = t.email
        WHERE t.tenant_id = s.tenant_id AND t.id = s.teacher_id AND NOT t.is_deleted AND u.id = $4
      ))
      AND EXISTS (
        SELECT 1 FROM (
          SELECT cs.student_id FROM class_students cs
            WHERE cs.tenant_id = s.tenant_id AND cs.class_id = s.class_id
          UNION SELECT r.student_id FROM attendance_session_students r
            WHERE r.tenant_id = s.tenant_id AND r.session_id = s.id
        ) roster
        JOIN students st ON st.tenant_id = s.tenant_id AND st.id = roster.student_id AND NOT st.is_deleted
        WHERE NOT EXISTS (SELECT 1 FROM attendance a WHERE a.tenant_id = s.tenant_id AND a.session_id = s.id AND a.student_id = roster.student_id)
      )`,
  tuition: `SELECT t.id, s.full_name AS title, t.due_date::text AS date, t.student_id, t.class_id,
      (t.amount_due - COALESCE(p.amount_paid, 0))::text AS outstanding_vnd
    FROM tuitions t JOIN students s ON s.id = t.student_id AND s.tenant_id = t.tenant_id
    LEFT JOIN LATERAL (SELECT SUM(amount_paid) AS amount_paid FROM payments
      WHERE tenant_id = t.tenant_id AND tuition_id = t.id) p ON true
    WHERE t.tenant_id = $1 AND t.due_date <= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date
      AND t.status <> $3 AND t.amount_due > COALESCE(p.amount_paid, 0)`,
  classes: `SELECT c.id, c.name AS title, c.start_date::text AS date, c.id AS class_id,
      (t.id IS NULL OR NOT t.is_active) AS missing_teacher,
      NOT EXISTS (SELECT 1 FROM schedule_sessions s WHERE s.tenant_id = c.tenant_id AND s.class_id = c.id
        AND s.status <> $4 AND s.session_date >= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date
        AND s.session_date < (CURRENT_TIMESTAMP AT TIME ZONE $2)::date + $5::int) AS missing_sessions
    FROM classes c LEFT JOIN teachers t ON t.id = c.teacher_id AND t.tenant_id = c.tenant_id AND NOT t.is_deleted
    WHERE c.tenant_id = $1 AND NOT c.is_deleted AND c.status = $3
      AND c.start_date < (CURRENT_TIMESTAMP AT TIME ZONE $2)::date + $5::int
      AND c.end_date >= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date`,
};

export class WorkItemsService {
  static async getWorkItems(
    tenantId: string,
    actor: { userId: string; role: string },
    options: { group?: WorkItemType; limit: number; offset: number }
  ) {
    const teacherOnly = actor.role === ROLES.TEACHER;
    if (
      ![ROLES.ADMIN, ROLES.STAFF, ROLES.SUPER_ADMIN, ROLES.TEACHER].some(
        (role) => role === actor.role
      )
    )
      throw new ForbiddenError();
    if (teacherOnly && options.group && options.group !== WORK_ITEM_TYPES.ATTENDANCE)
      throw new ForbiddenError();
    const types = options.group
      ? [options.group]
      : teacherOnly
        ? [WORK_ITEM_TYPES.ATTENDANCE]
        : Object.values(WORK_ITEM_TYPES);
    const groups = await Promise.all(
      types.map(async (type) => {
        const params: unknown[] = [tenantId, VIETNAM_TIME_ZONE];
        if (type === WORK_ITEM_TYPES.ATTENDANCE)
          params.push(SESSION_STATUS.CANCELLED, teacherOnly ? actor.userId : null);
        else if (type === WORK_ITEM_TYPES.TUITION) params.push(TUITION_STATUS.WAIVED);
        else params.push(CLASS_STATUS.ACTIVE, SESSION_STATUS.CANCELLED, WORKFLOW_LOOKAHEAD_DAYS);
        const limitIndex = params.push(options.limit);
        const offsetIndex = params.push(options.offset);
        const filter =
          type === WORK_ITEM_TYPES.CLASSES ? 'WHERE missing_teacher OR missing_sessions' : '';
        const result = await pool.query<WorkItemPage>(
          `WITH candidates AS (${WORK_ITEM_QUERIES[type]}), items AS (SELECT * FROM candidates ${filter})
         SELECT (SELECT COUNT(*)::int FROM items) AS total,
           COALESCE((SELECT json_agg(page) FROM (SELECT * FROM items ORDER BY date, id LIMIT $${limitIndex} OFFSET $${offsetIndex}) page), '[]'::json) AS items`,
          params
        );
        return { type, ...result.rows[0], limit: options.limit, offset: options.offset };
      })
    );
    const date = await pool.query<{ business_date: string }>(
      'SELECT (CURRENT_TIMESTAMP AT TIME ZONE $1)::date::text AS business_date',
      [VIETNAM_TIME_ZONE]
    );
    return { businessDate: date.rows[0].business_date, groups };
  }
}

import pool from '../db';

// A connected database is not ready for authentication until the matching
// session column, revocation trigger and OAuth transaction table are installed.
export async function isAuthSchemaReady(): Promise<boolean> {
  const { rows } = await pool.query<{ ready: boolean }>(
    `SELECT
       EXISTS (SELECT 1 FROM pg_attribute
               WHERE attrelid = 'public.users'::regclass AND attname = 'session_version'
                 AND NOT attisdropped)
       AND to_regclass('public.google_oauth_transactions') IS NOT NULL
       AND EXISTS (SELECT 1 FROM pg_trigger
                   WHERE tgrelid = 'public.users'::regclass
                     AND tgname = 'users_password_session_revocation'
                     AND tgenabled IN ('O', 'A')) AS ready`
  );
  return rows[0]?.ready === true;
}

const SCHEDULE_EXCLUSION_CONSTRAINTS = [
  'schedule_sessions_teacher_overlap',
  'schedule_sessions_room_overlap',
  'schedule_sessions_class_overlap',
];

export async function isScheduleSchemaReady(): Promise<boolean> {
  const { rows } = await pool.query<{ ready: boolean }>(
    `SELECT COUNT(*) = $2 AS ready FROM pg_constraint
     WHERE conrelid = to_regclass('public.schedule_sessions')
       AND contype = 'x' AND convalidated AND conname = ANY($1::text[])`,
    [SCHEDULE_EXCLUSION_CONSTRAINTS, SCHEDULE_EXCLUSION_CONSTRAINTS.length]
  );
  return rows[0]?.ready === true;
}

export async function isWorkflowSchemaReady(): Promise<boolean> {
  const { rows } = await pool.query<{ ready: boolean }>(`SELECT
    to_regclass('public.attendance_session_students') IS NOT NULL
    AND to_regclass('public.attendance_audit') IS NOT NULL
    AND to_regclass('public.google_calendar_links') IS NOT NULL
    AND to_regclass('public.google_sync_outbox') IS NOT NULL
    AND to_regclass('public.google_sync_jobs') IS NOT NULL
    AND to_regclass('public.google_sync_job_items') IS NOT NULL
    AND to_regprocedure('public.enqueue_google_session(uuid,uuid,uuid)') IS NOT NULL
    AND to_regprocedure('public.can_sync_google_session(uuid,uuid,uuid)') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.users') AND attname='google_connection_version' AND NOT attisdropped)
    AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.schedule_sessions') AND attname='attendance_version' AND NOT attisdropped)
    AND NOT EXISTS (
      SELECT 1 FROM (VALUES
        ('schedule_sessions','google_schedule_created'),('schedule_sessions','google_schedule_updated'),
        ('classes','google_class_changed'),('rooms','google_room_changed'),('teachers','google_teacher_changed'),
        ('students','google_student_changed'),('class_students','google_enrollment_changed'),
        ('tenants','google_tenant_changed'),('users','google_connection_versioned'),('users','google_user_changed')
      ) required(table_name,trigger_name)
      WHERE NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.' || required.table_name)
        AND tgname=required.trigger_name AND tgenabled IN ('O','A'))
    ) AS ready`);
  return rows[0]?.ready === true;
}

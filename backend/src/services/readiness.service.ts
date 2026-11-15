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

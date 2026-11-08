CREATE EXTENSION IF NOT EXISTS btree_gist;

SET LOCAL lock_timeout = '5s';
LOCK TABLE schedule_sessions IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  existing_conflict record;
BEGIN
  SELECT a.id AS first_id, b.id AS second_id INTO existing_conflict
  FROM schedule_sessions a
  JOIN schedule_sessions b
    ON a.tenant_id = b.tenant_id
   AND a.session_date = b.session_date
   AND a.id < b.id
   AND (a.teacher_id = b.teacher_id OR a.room_id = b.room_id OR a.class_id = b.class_id)
   AND a.start_time < b.end_time AND b.start_time < a.end_time
  WHERE a.status <> 'cancelled' AND b.status <> 'cancelled'
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Overlapping schedule sessions: % and %',
      existing_conflict.first_id, existing_conflict.second_id;
  END IF;
END;
$$;

ALTER TABLE schedule_sessions
  ADD CONSTRAINT schedule_sessions_teacher_overlap EXCLUDE USING gist (
    tenant_id WITH =, teacher_id WITH =,
    (tsrange(session_date + start_time, session_date + end_time, '[)')) WITH &&
  ) WHERE (status <> 'cancelled'),
  ADD CONSTRAINT schedule_sessions_room_overlap EXCLUDE USING gist (
    tenant_id WITH =, room_id WITH =,
    (tsrange(session_date + start_time, session_date + end_time, '[)')) WITH &&
  ) WHERE (status <> 'cancelled'),
  ADD CONSTRAINT schedule_sessions_class_overlap EXCLUDE USING gist (
    tenant_id WITH =, class_id WITH =,
    (tsrange(session_date + start_time, session_date + end_time, '[)')) WITH &&
  ) WHERE (status <> 'cancelled');

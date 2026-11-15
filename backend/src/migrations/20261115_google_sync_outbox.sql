-- Additive rollout; pause schedule/identity writes while installing triggers.
-- Backfill only queues work; Google is never called by this migration.
-- Retain tables on rollback. Older backends must not run their direct Calendar writer.
SET LOCAL lock_timeout = '5s';
ALTER TABLE users ADD CONSTRAINT uq_users_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE users ADD COLUMN google_connection_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE google_calendar_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  -- Deliberately no session FK: deletion jobs must survive hard deletes/regeneration.
  session_id UUID NOT NULL,
  event_id TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  legacy_event_id TEXT,
  legacy_confirmed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (tenant_id, user_id, session_id), UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE CASCADE
);
CREATE TABLE google_sync_outbox (
  link_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  revision BIGINT NOT NULL DEFAULT 1,
  connection_version INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  payload JSONB,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','syncing','synced','retry_needed','connection_required','confirmation_required')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  error_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, link_id) REFERENCES google_calendar_links(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_google_outbox_due ON google_sync_outbox (state, next_attempt_at, updated_at);
CREATE TABLE google_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_key UUID NOT NULL,
  UNIQUE (tenant_id,user_id,request_key),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_google_jobs_owner ON google_sync_jobs (tenant_id, user_id, created_at DESC);
CREATE TABLE google_sync_job_items (
  tenant_id UUID NOT NULL, job_id UUID NOT NULL, link_id UUID NOT NULL, revision BIGINT NOT NULL,
  PRIMARY KEY (job_id, link_id),
  FOREIGN KEY (tenant_id, job_id) REFERENCES google_sync_jobs(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, link_id) REFERENCES google_calendar_links(tenant_id, id) ON DELETE CASCADE
);

CREATE FUNCTION can_sync_google_session(p_tenant UUID, p_user UUID, p_session UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM schedule_sessions s
    JOIN classes c ON c.tenant_id=s.tenant_id AND c.id=s.class_id AND NOT c.is_deleted
    JOIN users u ON u.tenant_id=s.tenant_id AND u.id=p_user AND u.is_active
    JOIN tenants tenant ON tenant.id=s.tenant_id AND tenant.is_active
    WHERE s.tenant_id=p_tenant AND s.id=p_session AND s.status <> 'cancelled' AND (
      u.role IN ('admin','staff','super_admin') OR
      (u.role='teacher' AND EXISTS (SELECT 1 FROM teachers t WHERE t.tenant_id=s.tenant_id AND t.id=s.teacher_id AND t.email=u.email AND t.is_active AND NOT t.is_deleted)) OR
      (u.role='student' AND EXISTS (SELECT 1 FROM class_students cs JOIN students st ON st.tenant_id=cs.tenant_id AND st.id=cs.student_id AND st.email=u.email AND st.is_active AND NOT st.is_deleted
        WHERE cs.tenant_id=s.tenant_id AND cs.class_id=s.class_id AND cs.status='enrolled'))
    )
  )
$$;

CREATE FUNCTION enqueue_google_session(p_tenant UUID, p_session UUID, p_user UUID DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$
DECLARE event_payload JSONB;
BEGIN
  SELECT jsonb_build_object('date',s.session_date::text,'startTime',s.start_time::text,'endTime',s.end_time::text,
    'className',c.name,'roomName',r.name,'teacherName',t.full_name,'notes',COALESCE(s.notes,'')) INTO event_payload
  FROM schedule_sessions s
  JOIN classes c ON c.tenant_id=s.tenant_id AND c.id=s.class_id
  JOIN rooms r ON r.tenant_id=s.tenant_id AND r.id=s.room_id
  JOIN teachers t ON t.tenant_id=s.tenant_id AND t.id=s.teacher_id
  WHERE s.tenant_id=p_tenant AND s.id=p_session;

  INSERT INTO google_calendar_links (tenant_id,user_id,session_id,legacy_event_id)
  SELECT p_tenant,u.id,p_session,s.google_event_id FROM users u
  JOIN schedule_sessions s ON s.tenant_id=u.tenant_id AND s.id=p_session
  WHERE u.tenant_id=p_tenant AND (p_user IS NULL OR u.id=p_user) AND (u.google_access_token IS NOT NULL OR u.google_refresh_token IS NOT NULL)
    AND s.session_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    AND can_sync_google_session(p_tenant,u.id,p_session)
  ON CONFLICT (tenant_id,user_id,session_id) DO NOTHING;

  INSERT INTO google_sync_outbox (link_id,tenant_id,connection_version,operation,payload,next_attempt_at)
  SELECT l.id,l.tenant_id,u.google_connection_version,
    CASE WHEN can_sync_google_session(p_tenant,u.id,p_session) THEN 'upsert' ELSE 'delete' END,
    CASE WHEN can_sync_google_session(p_tenant,u.id,p_session) THEN event_payload ELSE NULL END,now()
  FROM google_calendar_links l JOIN users u ON u.tenant_id=l.tenant_id AND u.id=l.user_id
  WHERE l.tenant_id=p_tenant AND l.session_id=p_session AND (p_user IS NULL OR l.user_id=p_user)
  ON CONFLICT (link_id) DO UPDATE SET revision=google_sync_outbox.revision+1,
    connection_version=EXCLUDED.connection_version, operation=EXCLUDED.operation,payload=EXCLUDED.payload,
    state='pending',attempts=0,next_attempt_at=now(),error_code=NULL,updated_at=now()
  WHERE (google_sync_outbox.connection_version,google_sync_outbox.operation,google_sync_outbox.payload)
    IS DISTINCT FROM (EXCLUDED.connection_version,EXCLUDED.operation,EXCLUDED.payload);
END $$;

CREATE FUNCTION queue_google_schedule_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN PERFORM enqueue_google_session(OLD.tenant_id,OLD.id); RETURN OLD; END IF;
  PERFORM enqueue_google_session(NEW.tenant_id,NEW.id); RETURN NEW;
END $$;
CREATE TRIGGER google_schedule_created AFTER INSERT OR DELETE ON schedule_sessions FOR EACH ROW EXECUTE FUNCTION queue_google_schedule_change();
CREATE TRIGGER google_schedule_updated AFTER UPDATE OF session_date,start_time,end_time,class_id,teacher_id,room_id,notes,status ON schedule_sessions FOR EACH ROW EXECUTE FUNCTION queue_google_schedule_change();

CREATE FUNCTION queue_google_context_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_tenant UUID; target_session UUID; target_user UUID; target_id UUID; target_class UUID; previous_class UUID;
BEGIN
  IF TG_TABLE_NAME='tenants' THEN target_tenant:=COALESCE(NEW.id,OLD.id);
  ELSE target_tenant:=COALESCE(NEW.tenant_id,OLD.tenant_id); END IF;
  IF TG_TABLE_NAME='users' THEN target_user:=COALESCE(NEW.id,OLD.id); END IF;
  IF TG_TABLE_NAME='class_students' THEN
    target_class:=COALESCE(NEW.class_id,OLD.class_id);
    IF TG_OP='UPDATE' THEN previous_class:=OLD.class_id; END IF;
  ELSE target_id:=COALESCE(NEW.id,OLD.id); END IF;
  FOR target_session IN
    SELECT s.id FROM schedule_sessions s WHERE s.tenant_id=target_tenant AND (
      TG_TABLE_NAME IN ('users','tenants') OR
      (TG_TABLE_NAME='classes' AND s.class_id=target_id) OR
      (TG_TABLE_NAME='class_students' AND s.class_id IN (target_class,previous_class)) OR
      (TG_TABLE_NAME='teachers' AND s.teacher_id=target_id) OR
      (TG_TABLE_NAME='rooms' AND s.room_id=target_id) OR
      (TG_TABLE_NAME='students' AND EXISTS (SELECT 1 FROM class_students cs WHERE cs.tenant_id=s.tenant_id AND cs.class_id=s.class_id AND cs.student_id=target_id))
    )
    UNION SELECT session_id FROM google_calendar_links WHERE tenant_id=target_tenant
      AND (TG_TABLE_NAME='tenants' OR (TG_TABLE_NAME='users' AND user_id=target_user))
    ORDER BY id
  LOOP PERFORM enqueue_google_session(target_tenant,target_session,target_user); END LOOP;
  RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER google_class_changed AFTER UPDATE OF name,is_deleted ON classes FOR EACH ROW EXECUTE FUNCTION queue_google_context_change();
CREATE TRIGGER google_room_changed AFTER UPDATE OF name,is_deleted ON rooms FOR EACH ROW EXECUTE FUNCTION queue_google_context_change();
CREATE TRIGGER google_teacher_changed AFTER UPDATE OF email,full_name,is_active,is_deleted ON teachers FOR EACH ROW EXECUTE FUNCTION queue_google_context_change();
CREATE TRIGGER google_student_changed AFTER UPDATE OF email,is_active,is_deleted ON students FOR EACH ROW EXECUTE FUNCTION queue_google_context_change();
CREATE TRIGGER google_enrollment_changed AFTER INSERT OR UPDATE OR DELETE ON class_students FOR EACH ROW EXECUTE FUNCTION queue_google_context_change();
CREATE TRIGGER google_tenant_changed AFTER UPDATE OF is_active ON tenants FOR EACH ROW EXECUTE FUNCTION queue_google_context_change();

CREATE FUNCTION version_google_connection() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('google:' || NEW.tenant_id::text || ':' || NEW.id::text,0));
  UPDATE google_calendar_links SET legacy_confirmed=false WHERE tenant_id=NEW.tenant_id AND user_id=NEW.id;
  IF (NEW.google_access_token,NEW.google_refresh_token) IS DISTINCT FROM (OLD.google_access_token,OLD.google_refresh_token)
    AND NEW.google_connection_version=OLD.google_connection_version THEN
    NEW.google_connection_version:=OLD.google_connection_version+1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER google_connection_versioned BEFORE UPDATE OF google_access_token,google_refresh_token ON users FOR EACH ROW EXECUTE FUNCTION version_google_connection();
CREATE TRIGGER google_user_changed AFTER UPDATE OF email,role,is_active,google_access_token,google_refresh_token,google_connection_version ON users FOR EACH ROW EXECUTE FUNCTION queue_google_context_change();

DO $$ DECLARE s RECORD; BEGIN
  FOR s IN SELECT tenant_id,id FROM schedule_sessions
    WHERE session_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
  LOOP PERFORM enqueue_google_session(s.tenant_id,s.id); END LOOP;
END $$;

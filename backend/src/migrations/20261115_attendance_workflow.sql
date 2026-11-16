-- Additive migration. Lock wait is bounded; retain these tables on application rollback.
SET LOCAL lock_timeout = '5s';
ALTER TABLE schedule_sessions ADD COLUMN IF NOT EXISTS attendance_version INTEGER NOT NULL DEFAULT 0;

-- A session roster is evidence of membership at attendance time, not current enrollment.
CREATE TABLE attendance_session_students (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_id, student_id),
    FOREIGN KEY (tenant_id, session_id) REFERENCES schedule_sessions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id) ON DELETE CASCADE
);
INSERT INTO attendance_session_students (tenant_id, session_id, student_id)
SELECT tenant_id, session_id, student_id FROM attendance ON CONFLICT DO NOTHING;

CREATE TABLE attendance_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    actor_id UUID NOT NULL REFERENCES users(id),
    before_status VARCHAR(20),
    after_status VARCHAR(20) NOT NULL,
    reason VARCHAR(1000),
    confirmed_addition BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (tenant_id, session_id) REFERENCES schedule_sessions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_attendance_audit_session ON attendance_audit (tenant_id, session_id, created_at DESC, id);
CREATE INDEX idx_attendance_roster_tenant ON attendance_session_students (tenant_id, session_id);

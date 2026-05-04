-- ============================================================
-- Teaching Schedule Management System - PostgreSQL Schema (Multi-Tenant SaaS + Plan Registry)
-- ============================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;


-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ============================================================
-- PLAN REGISTRY (Feature Flag Engine Support)
-- ============================================================

CREATE TABLE plan_definitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'
    name            VARCHAR(150) NOT NULL,
    price_vnd       NUMERIC(12, 0) NOT NULL DEFAULT 0,
    price_usd       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plan_limits (
    plan_id         UUID NOT NULL REFERENCES plan_definitions(id) ON DELETE CASCADE,
    limit_key       VARCHAR(50) NOT NULL, -- e.g., 'max_branches', 'max_classes', 'max_teachers', 'max_rooms'
    limit_value     INT NOT NULL DEFAULT -1, -- -1 means unlimited
    PRIMARY KEY (plan_id, limit_key)
);

CREATE TABLE plan_features (
    plan_id         UUID NOT NULL REFERENCES plan_definitions(id) ON DELETE CASCADE,
    feature_key     VARCHAR(50) NOT NULL, -- e.g., 'multi_branch', 'advanced_reports', 'api_access', 'sso_saml'
    is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (plan_id, feature_key)
);

-- ============================================================
-- TENANT (SaaS CORE)
-- ============================================================

CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id         UUID NOT NULL REFERENCES plan_definitions(id) ON DELETE RESTRICT,
    name            VARCHAR(150) NOT NULL,
    domain          VARCHAR(100) UNIQUE, -- optional custom domain/subdomain
    contact_email   VARCHAR(150),
    status          VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'pending', 'suspended'
    api_key         VARCHAR(255), -- for external API access
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CORE TABLES (Tenant Isolated)
-- ============================================================


CREATE TABLE branches (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    address     TEXT,
    phone       VARCHAR(30),
    email       VARCHAR(150),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS (Authentication)
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL, -- nullable for tenant admins
    email           VARCHAR(150) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'teacher', -- 'admin', 'staff', 'teacher'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Email Verification
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMPTZ,
    
    -- Password Reset
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMPTZ,
    
    -- Google Calendar Integration
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_calendar_id VARCHAR(255),
    
    -- Notification Preferences
    notify_upcoming_sessions BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);



CREATE TABLE rooms (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    capacity    INT NOT NULL CHECK (capacity > 0),
    room_type   VARCHAR(50) NOT NULL DEFAULT 'classroom',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, branch_id, name)
);

CREATE TABLE teachers (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    full_name     VARCHAR(200) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    phone         VARCHAR(30),
    specialization VARCHAR(200),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

CREATE TABLE students (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    full_name   VARCHAR(200) NOT NULL,
    email       VARCHAR(150) NOT NULL,
    phone       VARCHAR(30),
    date_of_birth DATE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

CREATE TABLE subjects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(30) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

CREATE TABLE classes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    name            VARCHAR(200) NOT NULL,
    max_capacity    INT NOT NULL DEFAULT 30 CHECK (max_capacity > 0),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'active',
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

CREATE TABLE class_students (
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status      VARCHAR(30) NOT NULL DEFAULT 'enrolled',
    PRIMARY KEY (class_id, student_id)
);

-- ============================================================
-- SCHEDULING TABLES
-- ============================================================

CREATE TABLE schedule_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    session_date    DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    session_type    VARCHAR(30) NOT NULL DEFAULT 'lecture',
    notes           TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    is_notified     BOOLEAN NOT NULL DEFAULT FALSE, -- for cron email reminders
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- ============================================================
-- ATTENDANCE TRACKING
-- ============================================================

CREATE TABLE attendance (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id  UUID NOT NULL REFERENCES schedule_sessions(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'absent', -- 'present', 'absent', 'late', 'excused'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, student_id)
);

CREATE INDEX idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX idx_attendance_session ON attendance(session_id);

-- ============================================================
-- PLAN UPGRADE REQUESTS
-- ============================================================

CREATE TABLE plan_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requested_plan_id UUID NOT NULL REFERENCES plan_definitions(id) ON DELETE CASCADE,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    notes           TEXT,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_plan_requests_tenant ON plan_requests(tenant_id);
CREATE INDEX idx_plan_requests_status ON plan_requests(status);

-- ============================================================
-- INDEXES FOR PERFORMANCE & ISOLATION
-- ============================================================

CREATE INDEX idx_branches_tenant ON branches(tenant_id);
CREATE INDEX idx_rooms_tenant ON rooms(tenant_id);
CREATE INDEX idx_teachers_tenant ON teachers(tenant_id);
CREATE INDEX idx_classes_tenant ON classes(tenant_id);
CREATE INDEX idx_sessions_tenant ON schedule_sessions(tenant_id);

CREATE INDEX idx_sessions_conflict_teacher ON schedule_sessions(tenant_id, teacher_id, session_date, start_time, end_time) WHERE status != 'cancelled';
CREATE INDEX idx_sessions_conflict_room    ON schedule_sessions(tenant_id, room_id, session_date, start_time, end_time) WHERE status != 'cancelled';
CREATE INDEX idx_sessions_conflict_class   ON schedule_sessions(tenant_id, class_id, session_date, start_time, end_time) WHERE status != 'cancelled';

-- ============================================================
-- CONFLICT DETECTION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION check_schedule_conflict(
    p_tenant_id   UUID,
    p_teacher_id  UUID,
    p_room_id     UUID,
    p_class_id    UUID,
    p_date        DATE,
    p_start_time  TIME,
    p_end_time    TIME,
    p_exclude_id  UUID DEFAULT NULL
)
RETURNS TABLE (
    conflict_type   TEXT,
    conflict_id     UUID,
    detail          TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'TEACHER_CONFLICT'::TEXT, s.id, format('Teacher already has a session from %s to %s on %s', s.start_time, s.end_time, s.session_date)
    FROM schedule_sessions s
    WHERE s.tenant_id = p_tenant_id AND s.teacher_id = p_teacher_id AND s.session_date = p_date
      AND s.status != 'cancelled' AND (p_exclude_id IS NULL OR s.id != p_exclude_id)
      AND s.start_time < p_end_time AND s.end_time > p_start_time;

    RETURN QUERY
    SELECT 'ROOM_CONFLICT'::TEXT, s.id, format('Room is already booked from %s to %s on %s', s.start_time, s.end_time, s.session_date)
    FROM schedule_sessions s
    WHERE s.tenant_id = p_tenant_id AND s.room_id = p_room_id AND s.session_date = p_date
      AND s.status != 'cancelled' AND (p_exclude_id IS NULL OR s.id != p_exclude_id)
      AND s.start_time < p_end_time AND s.end_time > p_start_time;

    RETURN QUERY
    SELECT 'CLASS_CONFLICT'::TEXT, s.id, format('Class already has a session from %s to %s on %s', s.start_time, s.end_time, s.session_date)
    FROM schedule_sessions s
    WHERE s.tenant_id = p_tenant_id AND s.class_id = p_class_id AND s.session_date = p_date
      AND s.status != 'cancelled' AND (p_exclude_id IS NULL OR s.id != p_exclude_id)
      AND s.start_time < p_end_time AND s.end_time > p_start_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- AUDIT / UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at    BEFORE UPDATE ON tenants    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_branches_updated_at   BEFORE UPDATE ON branches   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rooms_updated_at      BEFORE UPDATE ON rooms      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_teachers_updated_at   BEFORE UPDATE ON teachers   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_students_updated_at   BEFORE UPDATE ON students   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_classes_updated_at    BEFORE UPDATE ON classes    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sessions_updated_at   BEFORE UPDATE ON schedule_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================

-- 1. Insert Plans
INSERT INTO plan_definitions (id, code, name, price_vnd, price_usd, sort_order) VALUES 
    ('ffffffff-0000-0000-0000-000000000001', 'FREE', 'Free', 0, 0, 1),
    ('ffffffff-0000-0000-0000-000000000002', 'PRO', 'Pro', 499000, 19.99, 2),
    ('ffffffff-0000-0000-0000-000000000003', 'BUSINESS', 'Business', 1499000, 59.99, 3),
    ('ffffffff-0000-0000-0000-000000000004', 'ENTERPRISE', 'Enterprise', 4999000, 199.99, 4);

-- 2. Insert Plan Limits
-- FREE
INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES 
    ('ffffffff-0000-0000-0000-000000000001', 'max_branches', 1),
    ('ffffffff-0000-0000-0000-000000000001', 'max_classes', 30),
    ('ffffffff-0000-0000-0000-000000000001', 'max_students', 50),
    ('ffffffff-0000-0000-0000-000000000001', 'max_teachers', 5),
    ('ffffffff-0000-0000-0000-000000000001', 'max_rooms', 10);
-- PRO
INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES 
    ('ffffffff-0000-0000-0000-000000000002', 'max_branches', 3),
    ('ffffffff-0000-0000-0000-000000000002', 'max_classes', 150),
    ('ffffffff-0000-0000-0000-000000000002', 'max_students', 500),
    ('ffffffff-0000-0000-0000-000000000002', 'max_teachers', 50),
    ('ffffffff-0000-0000-0000-000000000002', 'max_rooms', 50);
-- BUSINESS
INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES 
    ('ffffffff-0000-0000-0000-000000000003', 'max_branches', 10),
    ('ffffffff-0000-0000-0000-000000000003', 'max_classes', -1),
    ('ffffffff-0000-0000-0000-000000000003', 'max_students', -1),
    ('ffffffff-0000-0000-0000-000000000003', 'max_teachers', -1),
    ('ffffffff-0000-0000-0000-000000000003', 'max_rooms', -1);
-- ENTERPRISE
INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES 
    ('ffffffff-0000-0000-0000-000000000004', 'max_branches', -1),
    ('ffffffff-0000-0000-0000-000000000004', 'max_classes', -1),
    ('ffffffff-0000-0000-0000-000000000004', 'max_students', -1),
    ('ffffffff-0000-0000-0000-000000000004', 'max_teachers', -1),
    ('ffffffff-0000-0000-0000-000000000004', 'max_rooms', -1);

-- 3. Insert Plan Features
-- FREE (no advanced features)
-- PRO
INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES 
    ('ffffffff-0000-0000-0000-000000000002', 'multi_branch', TRUE);
-- BUSINESS
INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES 
    ('ffffffff-0000-0000-0000-000000000003', 'multi_branch', TRUE),
    ('ffffffff-0000-0000-0000-000000000003', 'advanced_reports', TRUE),
    ('ffffffff-0000-0000-0000-000000000003', 'api_access', TRUE);
-- ENTERPRISE
INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES 
    ('ffffffff-0000-0000-0000-000000000004', 'multi_branch', TRUE),
    ('ffffffff-0000-0000-0000-000000000004', 'advanced_reports', TRUE),
    ('ffffffff-0000-0000-0000-000000000004', 'api_access', TRUE),
    ('ffffffff-0000-0000-0000-000000000004', 'sso_saml', TRUE);

-- 4. Insert Tenants
-- Tenant 1: Enterprise
INSERT INTO tenants (id, plan_id, name, domain) 
VALUES ('00000000-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000004', 'Premium Education Center', 'premium-edu');

-- Tenant 2: Free
INSERT INTO tenants (id, plan_id, name, domain) 
VALUES ('00000000-0000-0000-0000-000000000002', 'ffffffff-0000-0000-0000-000000000001', 'Local Math Tutor', 'local-math');

-- 5. Insert Branches
INSERT INTO branches (id, tenant_id, name, address, phone) VALUES
    ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Downtown Campus', '123 Main St', '555-0101'),
    ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Westside Campus', '456 West Ave', '555-0202'),
    ('11111111-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Main Office', '789 Home St', '555-0303');

-- 6. Insert Users
-- Password for all seed users is '123456' (bcrypt hash)
INSERT INTO users (id, tenant_id, branch_id, email, password_hash, full_name, role) VALUES
    ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NULL, 'admin@premium-edu.com', '$2b$10$tEfz1SbXlnQgoItiSSbapew27RHf7IwqjSNjWmzOoE1nScWQiq.qO', 'Admin User', 'admin'),
    ('22222222-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', NULL, 'admin@local-math.com', '$2b$10$tEfz1SbXlnQgoItiSSbapew27RHf7IwqjSNjWmzOoE1nScWQiq.qO', 'Admin Tutor', 'admin');

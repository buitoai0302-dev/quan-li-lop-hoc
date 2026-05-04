-- ============================================================
-- MIGRATION: Fix missing columns and schema inconsistencies
-- Run this against your existing database if you already ran schema.sql
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ============================================================

-- 1. Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- 2. Add missing columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS api_key VARCHAR(255);

-- 3. Add missing column to schedule_sessions
ALTER TABLE schedule_sessions ADD COLUMN IF NOT EXISTS is_notified BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Fix plan_definitions: rename price_monthly -> split into price_vnd + price_usd
-- (Only run if price_monthly still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plan_definitions' AND column_name = 'price_monthly'
  ) THEN
    ALTER TABLE plan_definitions RENAME COLUMN price_monthly TO price_vnd;
    ALTER TABLE plan_definitions ADD COLUMN price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
    -- Backfill price_usd from price_vnd (approximate: 1 USD = 25000 VND)
    UPDATE plan_definitions SET price_usd = ROUND(price_vnd / 25000.0, 2);
  END IF;
END $$;

-- 5. Fix plan_requests: rename requested_plan_id -> plan_id if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plan_requests' AND column_name = 'requested_plan_id'
  ) THEN
    -- plan_requests uses requested_plan_id in schema, plan_id in old controller
    -- Keep as requested_plan_id (controller was fixed to match)
    RAISE NOTICE 'plan_requests.requested_plan_id already correct';
  END IF;
END $$;

-- Add missing columns to plan_requests
ALTER TABLE plan_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE plan_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Create attendance table if not exists
CREATE TABLE IF NOT EXISTS attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id  UUID NOT NULL REFERENCES schedule_sessions(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL DEFAULT 'absent',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);

-- 7. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_plan_requests_tenant ON plan_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_requests_status ON plan_requests(status);

-- 8. Add is_deleted to classes if missing
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 9. Add max_students to plan_limits seed data if missing
INSERT INTO plan_limits (plan_id, limit_key, limit_value)
SELECT id, 'max_students', 50 FROM plan_definitions WHERE code = 'FREE'
ON CONFLICT (plan_id, limit_key) DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value)
SELECT id, 'max_students', 500 FROM plan_definitions WHERE code = 'PRO'
ON CONFLICT (plan_id, limit_key) DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value)
SELECT id, 'max_students', -1 FROM plan_definitions WHERE code = 'BUSINESS'
ON CONFLICT (plan_id, limit_key) DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value)
SELECT id, 'max_students', -1 FROM plan_definitions WHERE code = 'ENTERPRISE'
ON CONFLICT (plan_id, limit_key) DO NOTHING;

-- Done
SELECT 'Migration completed successfully' as result;

-- Migration: Create plan_requests table
CREATE TABLE IF NOT EXISTS plan_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requested_plan_id UUID NOT NULL REFERENCES plan_definitions(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_requests_tenant ON plan_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_requests_status ON plan_requests(status);

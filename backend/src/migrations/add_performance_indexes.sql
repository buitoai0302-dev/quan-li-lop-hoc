-- Indexes cho bảng lớn nhất
CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_tenant_active ON students(tenant_id, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_teachers_tenant_id ON teachers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classes_tenant_id ON classes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classes_branch ON classes(tenant_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_schedule_sessions_date ON schedule_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_schedule_sessions_class ON schedule_sessions(class_id, session_date);
CREATE INDEX IF NOT EXISTS idx_schedule_sessions_notified ON schedule_sessions(is_notified, session_date) WHERE is_notified = false;

CREATE INDEX IF NOT EXISTS idx_tuitions_tenant_status ON tuitions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tuitions_student ON tuitions(student_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tuitions_due_date ON tuitions(due_date, status) WHERE status IN ('unpaid', 'partial', 'overdue');

CREATE INDEX IF NOT EXISTS idx_payments_tuition ON payments(tuition_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant ON billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_limits_plan ON plan_limits(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);

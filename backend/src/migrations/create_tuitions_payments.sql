-- Migration: create_tuitions_payments
-- Quản lý học phí nội bộ của các Trung tâm

-- 1. Bảng Học phí (Tuitions)
CREATE TABLE IF NOT EXISTS tuitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  
  -- Chu kỳ thanh toán: 'monthly' | 'per_session' | 'per_course'
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  -- Dùng cho monthly: 'YYYY-MM', cho per_course: NULL
  billing_period VARCHAR(7),
  
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Số tiền giảm giá
  amount_due NUMERIC(15,2) GENERATED ALWAYS AS (amount - discount) STORED, -- Số tiền phải trả
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Đã thu được
  
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid | partial | paid | overdue | waived
  
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bảng Lịch sử thanh toán học phí (Payments)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tuition_id UUID NOT NULL REFERENCES tuitions(id) ON DELETE CASCADE,
  
  amount_paid NUMERIC(15,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'cash', -- cash | bank_transfer | momo | vnpay | stripe | other
  reference_code VARCHAR(200), -- Mã giao dịch ngân hàng hoặc ví điện tử
  gateway_response JSONB, -- Dữ liệu phản hồi từ cổng thanh toán (nếu có)
  
  received_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_tuitions_tenant_id ON tuitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tuitions_student_id ON tuitions(student_id);
CREATE INDEX IF NOT EXISTS idx_tuitions_class_id ON tuitions(class_id);
CREATE INDEX IF NOT EXISTS idx_tuitions_status ON tuitions(status);
CREATE INDEX IF NOT EXISTS idx_tuitions_due_date ON tuitions(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_tuition_id ON payments(tuition_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);

-- 4. Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_tuition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tuitions_updated_at ON tuitions;
CREATE TRIGGER tuitions_updated_at
  BEFORE UPDATE ON tuitions
  FOR EACH ROW EXECUTE FUNCTION update_tuition_updated_at();

-- 5. Trigger tự động cập nhật amount_paid và status trong tuitions khi có payment mới
CREATE OR REPLACE FUNCTION sync_tuition_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid NUMERIC;
  tuition_amount_due NUMERIC;
BEGIN
  -- Tính tổng đã thu cho tuition này
  SELECT COALESCE(SUM(amount_paid), 0)
  INTO total_paid
  FROM payments
  WHERE tuition_id = COALESCE(NEW.tuition_id, OLD.tuition_id);

  -- Lấy số tiền phải thu
  SELECT amount_due INTO tuition_amount_due
  FROM tuitions
  WHERE id = COALESCE(NEW.tuition_id, OLD.tuition_id);

  -- Cập nhật tuition
  UPDATE tuitions
  SET
    amount_paid = total_paid,
    status = CASE
      WHEN total_paid <= 0 THEN 'unpaid'
      WHEN total_paid >= tuition_amount_due THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.tuition_id, OLD.tuition_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_sync_tuition ON payments;
CREATE TRIGGER payments_sync_tuition
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_tuition_payment_status();

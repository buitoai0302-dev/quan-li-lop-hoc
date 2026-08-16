-- Migration: create_billing_invoices
-- Quản lý hóa đơn SaaS (thu tiền gói cước từ Tenant)

-- 1. Cập nhật bảng plan_definitions: thêm billing_mode nếu chưa có
ALTER TABLE plan_definitions 
  ADD COLUMN IF NOT EXISTS billing_mode VARCHAR(20) NOT NULL DEFAULT 'manual',  -- manual | auto_monthly | auto_one_time
  ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(200),  -- Stripe Price ID cho recurring
  ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(15,2);   -- Giá tháng (dùng cho VNPay/MoMo)

-- 2. Bảng Hóa đơn SaaS (Billing Invoices)
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plan_definitions(id),
  
  amount NUMERIC(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'VND',
  
  -- Cổng thanh toán: manual | vnpay | momo | stripe
  payment_gateway VARCHAR(20) NOT NULL DEFAULT 'manual',
  
  -- Trạng thái: pending | paid | failed | refunded | cancelled
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  
  -- Dữ liệu từ cổng thanh toán
  gateway_order_id VARCHAR(200) UNIQUE,     -- ID đơn hàng gửi lên gateway
  gateway_transaction_id VARCHAR(200),      -- ID giao dịch từ gateway trả về
  gateway_response JSONB,                   -- Raw response để audit
  
  -- Chu kỳ (cho recurring monthly)
  billing_period_start DATE,
  billing_period_end DATE,
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,  -- Khi nào gói hết hạn
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant_id ON billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_gateway_order_id ON billing_invoices(gateway_order_id);

-- 4. Thêm cột billing vào tenants nếu chưa có
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,          -- Khi nào gói hiện tại hết hạn
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(200),      -- Stripe Customer ID
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(200);  -- Stripe Subscription ID (recurring)

-- 5. Auto-update trigger
CREATE OR REPLACE FUNCTION update_billing_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS billing_invoices_updated_at ON billing_invoices;
CREATE TRIGGER billing_invoices_updated_at
  BEFORE UPDATE ON billing_invoices
  FOR EACH ROW EXECUTE FUNCTION update_billing_invoice_updated_at();

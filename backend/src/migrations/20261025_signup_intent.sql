ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS signup_plan_id UUID REFERENCES plan_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signup_billing_cycle VARCHAR(10);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_signup_billing_cycle_check') THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_signup_billing_cycle_check
      CHECK (signup_billing_cycle IS NULL OR signup_billing_cycle IN ('MONTHLY', 'YEARLY'));
  END IF;
END $$;

-- Adds the columns previously installed by the standalone yearly-pricing script.
-- ALTER TABLE holds an exclusive lock until commit. Keep the columns on application rollback.
SET LOCAL lock_timeout = '5s';

ALTER TABLE plan_definitions
    ADD COLUMN IF NOT EXISTS yearly_price_vnd NUMERIC(12, 0),
    ADD COLUMN IF NOT EXISTS yearly_price_usd NUMERIC(10, 2);

UPDATE plan_definitions
SET yearly_price_vnd = COALESCE(yearly_price_vnd, price_vnd * 10),
    yearly_price_usd = COALESCE(yearly_price_usd, price_usd * 10)
WHERE yearly_price_vnd IS NULL OR yearly_price_usd IS NULL;

ALTER TABLE plan_definitions
    ALTER COLUMN yearly_price_vnd SET DEFAULT 0,
    ALTER COLUMN yearly_price_vnd SET NOT NULL,
    ALTER COLUMN yearly_price_usd SET DEFAULT 0,
    ALTER COLUMN yearly_price_usd SET NOT NULL;

ALTER TABLE plan_requests
    ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY';

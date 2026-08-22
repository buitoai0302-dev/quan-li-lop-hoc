import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    'postgresql://neondb_owner:npg_ywmDuHrp1x3Y@ep-red-salad-ao9yjh83-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function main() {
  const client = await pool.connect();
  try {
    // 1. Add yearly_price_vnd and yearly_price_usd to plan_definitions
    await client.query(`
      ALTER TABLE plan_definitions 
      ADD COLUMN IF NOT EXISTS yearly_price_vnd NUMERIC(12, 0) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS yearly_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00
    `);
    console.log('Added yearly price columns to plan_definitions');

    // 2. Default yearly price to 10 * monthly price for existing plans (so it's ~16% discount)
    await client.query(`
      UPDATE plan_definitions
      SET yearly_price_vnd = price_vnd * 10,
          yearly_price_usd = price_usd * 10
      WHERE yearly_price_vnd = 0 AND price_vnd > 0
    `);
    console.log('Set default yearly prices based on monthly prices');

    // 3. Add billing_cycle to plan_requests
    await client.query(`
      ALTER TABLE plan_requests 
      ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'
    `);
    console.log('Added billing_cycle column to plan_requests');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

main();

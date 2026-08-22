import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    'postgresql://neondb_owner:npg_ywmDuHrp1x3Y@ep-red-salad-ao9yjh83-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function main() {
  const client = await pool.connect();
  try {
    const plansResult = await client.query('SELECT id, code FROM plan_definitions');
    const plans = plansResult.rows;

    const newFeatures = ['attendance', 'branches', 'tuition'];

    for (const plan of plans) {
      const isEnabled = plan.code !== 'FREE';
      for (const feature of newFeatures) {
        await client.query(
          `INSERT INTO plan_features (plan_id, feature_key, is_enabled) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled`,
          [plan.id, feature, isEnabled]
        );
        console.log(`Added feature ${feature} to plan ${plan.code} (enabled: ${isEnabled})`);
      }
    }
    console.log('Successfully added new features to all plans.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

main();

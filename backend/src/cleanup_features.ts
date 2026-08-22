import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    'postgresql://neondb_owner:npg_ywmDuHrp1x3Y@ep-red-salad-ao9yjh83-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function main() {
  const client = await pool.connect();
  try {
    // Delete the old 'multi_branch' key to avoid duplication with 'branches'
    const result = await client.query(
      `DELETE FROM plan_features WHERE feature_key = 'multi_branch'`
    );
    console.log(`Deleted ${result.rowCount} rows with feature_key 'multi_branch'`);

    // Let's also check what features are currently in the db to be sure
    const currentFeatures = await client.query('SELECT DISTINCT feature_key FROM plan_features');
    console.log('Current unique feature keys in DB:');
    currentFeatures.rows.forEach((row) => console.log('-', row.feature_key));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

main();

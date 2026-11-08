import 'dotenv/config';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: databaseUrl });

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

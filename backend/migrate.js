const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ywmDuHrp1x3Y@ep-red-salad-ao9yjh83-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function runMigrations() {
  await client.connect();
  const migrationsDir = path.join(__dirname, 'src/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running: ${file}`);
    try {
      await client.query(sql);
      console.log(`  ✅ Done`);
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }
  await client.end();
  console.log('\nAll migrations complete.');
}

runMigrations().catch(console.error);

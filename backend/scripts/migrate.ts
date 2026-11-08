import pool from '../src/db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function migrate() {
  const directory = path.resolve(__dirname, '../src/migrations');
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(directory, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(814628100)');
      await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE name = $1', [file]);
      if (existing.rows.length > 0) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Migration changed after application: ${file}`);
      } else {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, checksum]);
        console.log(`Applied ${file}`);
      }
      await client.query('COMMIT');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

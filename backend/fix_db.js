const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Altering classes table...');
    await pool.query('ALTER TABLE classes ALTER COLUMN teacher_id DROP NOT NULL;');
    console.log('Successfully dropped NOT NULL constraint on teacher_id');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

migrate();

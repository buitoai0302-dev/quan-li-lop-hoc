const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Adding contact_email to tenants...');
    await pool.query('ALTER TABLE tenants ADD COLUMN contact_email VARCHAR(150);');
    console.log('Done!');
  } catch (err) {
    if (err.code === '42701') {
      console.log('Column already exists.');
    } else {
      console.error(err);
    }
  } finally {
    await pool.end();
  }
}

migrate();

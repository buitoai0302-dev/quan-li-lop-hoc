const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runSeed() {
  try {
    console.log('Inserting dummy data...');
    const sql = fs.readFileSync(path.join(__dirname, 'dummy_seed.sql'), 'utf-8');
    await pool.query(sql);
    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

runSeed();

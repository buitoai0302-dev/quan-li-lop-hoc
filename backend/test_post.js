const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const token = jwt.sign(
      { userId: '69b902ea-d8ab-4ecf-9c55-bdcf366bec7e', tenantId: '00000000-0000-0000-0000-000000000002', role: 'admin' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    const branchRes = await pool.query('SELECT id FROM branches LIMIT 1');
    if (branchRes.rows.length === 0) {
      console.log('No branches found');
      return;
    }
    const branch_id = branchRes.rows[0].id;

    console.log('Sending POST to http://localhost:3000/api/classes...');
    const res = await axios.post('http://localhost:3000/api/classes', {
      name: 'Test Class ' + Date.now(),
      max_capacity: 30,
      branch_id: branch_id,
      teacher_id: null,
      subject_id: "",
      start_date: null,
      end_date: null,
      status: "active"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('SUCCESS:', res.data);
  } catch (err) {
    if (err.response) {
      console.log('ERROR STATUS:', err.response.status);
      console.log('ERROR DATA:', err.response.data);
    } else {
      console.log('ERROR:', err.message);
    }
  } finally {
    pool.end();
  }
}

run();

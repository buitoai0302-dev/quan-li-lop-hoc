const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkWeekly() {
  try {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const queryStartDate = '2026-05-01';
    const queryEndDate = '2026-05-07';
    
    let sql = `
      SELECT s.*, 
             s.session_date::text as session_date,
             c.name as class_name, 
             t.full_name as teacher_name, 
             r.name as room_name,
             r.branch_id
      FROM schedule_sessions s
      JOIN classes c ON s.class_id = c.id
      JOIN teachers t ON s.teacher_id = t.id
      JOIN rooms r ON s.room_id = r.id
      WHERE s.tenant_id = $1 
        AND s.session_date >= $2 
        AND s.session_date <= $3
        AND s.status != 'cancelled'
    `;
    const params = [tenantId, queryStartDate, queryEndDate];
    const res = await pool.query(sql, params);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkWeekly();

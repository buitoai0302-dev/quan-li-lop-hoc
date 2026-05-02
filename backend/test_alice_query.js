const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'process.env.DATABASE_URL' });

async function test() {
  try {
    const userEmail = 'alice@student.com';
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
      JOIN classes c ON s.class_id = c.id AND c.is_deleted = false
      JOIN teachers t ON s.teacher_id = t.id AND t.is_deleted = false
      JOIN rooms r ON s.room_id = r.id AND r.is_deleted = false
      WHERE s.tenant_id = $1 
        AND s.session_date >= $2 
        AND s.session_date <= $3
        AND s.status != 'cancelled'
    `;
    const params = [tenantId, queryStartDate, queryEndDate];

    const studentRes = await pool.query('SELECT id FROM students WHERE email = $1', [userEmail]);
    if (studentRes.rows.length > 0) {
      params.push(studentRes.rows[0].id);
      sql += ` AND s.class_id IN (SELECT class_id FROM class_students WHERE student_id = $${params.length})`;
    }

    sql += ' ORDER BY s.session_date, s.start_time';
    
    console.log('SQL:', sql);
    console.log('Params:', params);
    
    const result = await pool.query(sql, params);
    console.log('Success:', result.rows.length, 'rows');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
test();

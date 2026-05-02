const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: 'process.env.DATABASE_URL'
});

async function fixAccounts() {
  try {
    const hash = await bcrypt.hash('123456', 10);
    
    // Find an existing teacher
    const { rows: teachers } = await pool.query('SELECT * FROM teachers WHERE is_deleted = false AND email IS NOT NULL LIMIT 1');
    if (teachers.length > 0) {
      const t = teachers[0];
      // Check if user exists
      const { rows: existingTeacherUsers } = await pool.query('SELECT id FROM users WHERE email = $1', [t.email]);
      if (existingTeacherUsers.length === 0) {
        await pool.query('INSERT INTO users (id, tenant_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)', [crypto.randomUUID(), t.tenant_id, t.full_name, t.email, hash, 'teacher']);
      } else {
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, t.email]);
      }
      console.log('Teacher test account:', t.email);
    } else {
      console.log('No teacher found in DB. Please create one first.');
    }

    // Find an existing student
    const { rows: students } = await pool.query('SELECT * FROM students WHERE is_deleted = false AND email IS NOT NULL LIMIT 1');
    if (students.length > 0) {
      const s = students[0];
      // Check if user exists
      const { rows: existingStudentUsers } = await pool.query('SELECT id FROM users WHERE email = $1', [s.email]);
      if (existingStudentUsers.length === 0) {
        await pool.query('INSERT INTO users (id, tenant_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)', [crypto.randomUUID(), s.tenant_id, s.full_name, s.email, hash, 'student']);
      } else {
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, s.email]);
      }
      console.log('Student test account:', s.email);
    } else {
      console.log('No student found in DB. Please create one first.');
    }
    
  } catch(e) {
    console.error(e.message);
  }
  process.exit(0);
}

fixAccounts();

const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    // get a tenant
    const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
    if (tenantRes.rows.length === 0) {
      console.log('No tenant found');
      return;
    }
    const tenantId = tenantRes.rows[0].id;

    // get a branch
    const branchRes = await pool.query('SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (branchRes.rows.length === 0) {
        console.log('No branch found');
        return;
    }
    const branch_id = branchRes.rows[0].id;

    // get a subject
    const subjectRes = await pool.query('SELECT id FROM subjects WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    let subject_id = subjectRes.rows.length > 0 ? subjectRes.rows[0].id : null;
    if (!subject_id) {
        const newSub = await pool.query(`INSERT INTO subjects (tenant_id, name, code) VALUES ($1, 'General', 'GEN') RETURNING id`, [tenantId]);
        subject_id = newSub.rows[0].id;
    }

    const insertSql = `
      INSERT INTO classes 
        (tenant_id, branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const insertParams = [tenantId, branch_id, subject_id, null, 'Test Class', 30, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]];

    const newClass = await pool.query(insertSql, insertParams);
    console.log('Success:', newClass.rows[0]);

  } catch (err) {
    console.error('Error during insert:', err);
  } finally {
    pool.end();
  }
}

test();

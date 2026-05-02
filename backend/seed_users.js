const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = new Pool({ connectionString: 'process.env.DATABASE_URL' });

async function seed() {
  try {
    const res = await pool.query('SELECT * FROM tenants LIMIT 1');
    const tenantId = res.rows[0].id;
    const hash = await bcrypt.hash('123456', 10);
    
    try { await pool.query('INSERT INTO users (id, tenant_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)', [crypto.randomUUID(), tenantId, 'Staff Demo', 'staff@example.com', hash, 'staff']); } catch(e) {}
    try { await pool.query('INSERT INTO users (id, tenant_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)', [crypto.randomUUID(), tenantId, 'Teacher Demo', 'teacher@example.com', hash, 'teacher']); } catch(e) {}
    try { await pool.query('INSERT INTO users (id, tenant_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)', [crypto.randomUUID(), tenantId, 'Student Demo', 'student@example.com', hash, 'student']); } catch(e) {}
    
    console.log('Created dummy users successfully.');
  } catch(e) {
    console.error(e.message);
  }
  process.exit(0);
}
seed();

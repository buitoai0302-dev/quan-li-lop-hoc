// Read-only inventory of the isolated pilot demo tenant.
const { Client } = require('pg');
require('dotenv').config({ quiet: true });

const email = 'pilot.local.20261024@example.test';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const tenant = await client.query(
      `SELECT t.id, t.name, p.code AS plan FROM tenants t
       LEFT JOIN plan_definitions p ON p.id = t.plan_id
       JOIN users u ON u.tenant_id = t.id AND u.email = $1 AND u.role = 'admin'
       WHERE t.contact_email = $1 AND t.name = 'Pilot Local Demo'`,
      [email]
    );
    if (tenant.rowCount !== 1) throw new Error('Isolated pilot demo tenant not found exactly once');
    const id = tenant.rows[0].id;
    const tables = ['branches', 'rooms', 'teachers', 'students', 'classes', 'schedule_sessions', 'attendance', 'tuitions', 'payments'];
    const counts = {};
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE tenant_id = $1`, [id]);
      counts[table] = result.rows[0].count;
    }
    const months = await client.query(`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM students WHERE tenant_id = $1 AND is_deleted = false
        GROUP BY 1 ORDER BY 1`, [id]);
    const statuses = await client.query(`SELECT status, COUNT(*)::int AS count FROM classes WHERE tenant_id = $1 AND is_deleted = false GROUP BY status ORDER BY status`, [id]);
    const attendance = await client.query(`SELECT s.session_date::text AS day, COUNT(*)::int AS count FROM attendance a
        JOIN schedule_sessions s ON s.id = a.session_id
        WHERE a.tenant_id = $1 AND s.session_date >= CURRENT_DATE - 6
        GROUP BY s.session_date ORDER BY s.session_date`, [id]);
    console.log(JSON.stringify({ tenant: tenant.rows[0].name, plan: tenant.rows[0].plan, counts, studentMonths: months.rows, classStatuses: statuses.rows, recentAttendance: attendance.rows }, null, 2));
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
}

main().catch(error => { console.error('AUDIT_FAILED', error.message); process.exitCode = 1; });

import pool from '../src/db';

async function checkSchema() {
  const tables = ['users', 'rooms', 'schedule_sessions', 'teachers', 'tenants', 'classes', 'students', 'subjects', 'class_recurring_schedules'];
  try {
    for (const table of tables) {
      const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(`Columns in ${table} table:`, res.rows.map(r => r.column_name));
    }
    
    const funcDef = await pool.query(`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'check_schedule_conflict'`);
    if (funcDef.rows.length > 0) {
      console.log('Definition of check_schedule_conflict:');
      console.log(funcDef.rows[0].pg_get_functiondef);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();

import pool from '../src/db';

async function checkTypes() {
  try {
    const res = await pool.query(`
      SELECT n.nspname as schema, t.typname as type 
      FROM pg_type t 
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
      WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid)) 
      AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
      AND n.nspname = 'public'
    `);
    
    console.log('Custom Types in public schema:');
    for (const row of res.rows) {
      console.log(`- ${row.type}`);
      // Get enum values if it's an enum
      const enumRes = await pool.query(`
        SELECT enumlabel 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = $1
        ORDER BY enumsortorder
      `, [row.type]);
      
      if (enumRes.rows.length > 0) {
        console.log(`  Values: ${enumRes.rows.map(r => r.enumlabel).join(', ')}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTypes();

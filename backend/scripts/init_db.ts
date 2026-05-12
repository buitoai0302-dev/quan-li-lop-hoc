import pool from '../src/db';
import * as fs from 'fs';
import * as path from 'path';

async function initDatabase() {
  try {
    console.log('--- Starting Database Initialization ---');

    // Path to schema.sql (adjust if necessary)
    const schemaPath = path.join(__dirname, '../../schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error(`Error: schema.sql not found at ${schemaPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await pool.query(sql);

    console.log('--- Database Initialized Successfully ---');
    process.exit(0);
  } catch (err: any) {
    console.error('Error during database initialization:');
    console.error(err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  }
}

initDatabase();

import fs from 'fs';
import path from 'path';
import pool from './db';

const runSeed = async () => {
  try {
    console.log('Connecting to the database...');

    // Read the schema.sql file from the root directory
    const schemaPath = path.join(__dirname, '../../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Executing schema.sql on the remote database...');
    // Execute the SQL file
    await pool.query(schemaSql);

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding the database:', error);
  } finally {
    await pool.end();
  }
};

runSeed();

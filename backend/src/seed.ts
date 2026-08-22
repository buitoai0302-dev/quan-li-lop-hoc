import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';
import pool from './db';

const runSeed = async () => {
  try {
    logger.info('Connecting to the database...');

    // Read the schema.sql file from the root directory
    const schemaPath = path.join(__dirname, '../../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    logger.info('Executing schema.sql on the remote database...');
    // Execute the SQL file
    await pool.query(schemaSql);

    logger.info('✅ Database seeded successfully!');
  } catch (error) {
    logger.error(error, '❌ Error seeding the database:');
  } finally {
    await pool.end();
  }
};

runSeed();

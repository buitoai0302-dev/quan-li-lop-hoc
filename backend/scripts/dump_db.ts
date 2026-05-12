import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function dumpDatabase() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('Error: DATABASE_URL not found in .env file');
    process.exit(1);
  }

  const date = new Date().toISOString().split('T')[0];
  const dumpFile = `backup_${date}.sql`;
  const dumpPath = path.join(__dirname, '../', dumpFile);

  console.log(`--- Starting Database Dump to ${dumpFile} ---`);

  // Note: This requires pg_dump to be installed and in your PATH
  const command = `pg_dump "${dbUrl}" > "${dumpPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error during dump:');
      console.error(error.message);
      console.log(
        '\nTip: Make sure PostgreSQL tools (pg_dump) are installed and added to your system PATH.'
      );
      process.exit(1);
    }
    if (stderr && !stderr.includes('Warning')) {
      console.error('Stderr:', stderr);
    }

    console.log(`--- Success! Database dumped to: ${dumpPath} ---`);
    process.exit(0);
  });
}

dumpDatabase();

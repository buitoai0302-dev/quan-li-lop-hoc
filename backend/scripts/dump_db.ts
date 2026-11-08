import { spawn } from 'child_process';
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

  // Keep the connection string out of shell commands and process arguments.
  const child = spawn('pg_dump', ['--no-password', '--file', dumpPath], {
    shell: false,
    windowsHide: true,
    env: { ...process.env, PGDATABASE: dbUrl },
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += String(chunk); });
  child.on('error', error => {
    fs.rmSync(dumpPath, { force: true });
    console.error('Could not start pg_dump:', error.message);
    process.exitCode = 1;
  });
  child.on('close', code => {
    if (code !== 0) {
      fs.rmSync(dumpPath, { force: true });
      console.error('Database dump failed:', stderr.trim() || `pg_dump exited with code ${code}`);
      process.exitCode = 1;
      return;
    }
    console.log(`--- Success! Database dumped to: ${dumpPath} ---`);
  });
}

dumpDatabase();

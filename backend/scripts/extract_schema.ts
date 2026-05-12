import pool from '../src/db';
import * as fs from 'fs';
import * as path from 'path';

async function extractSchema() {
  try {
    console.log('--- Starting Database Schema Extraction ---');

    // 1. Get all tables
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesRes.rows.map((r) => r.table_name);
    let report = '# Database Schema Report\n\n';
    report += `Generated at: ${new Date().toLocaleString()}\n\n`;

    for (const table of tables) {
      report += `## Table: ${table}\n\n`;

      // 2. Get columns for each table
      const columnsRes = await pool.query(
        `
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `,
        [table]
      );

      report += '| Column | Data Type | Nullable | Default |\n';
      report += '|--------|-----------|----------|---------|\n';

      for (const col of columnsRes.rows) {
        report += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || ''} |\n`;
      }
      report += '\n';
    }

    // 3. Get Functions
    const funcRes = await pool.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
    `);

    report += '## Functions/Procedures\n\n';
    for (const fn of funcRes.rows) {
      report += `- ${fn.routine_name} (${fn.routine_type})\n`;
    }

    const reportPath = path.join(__dirname, '../db_report.md');
    fs.writeFileSync(reportPath, report);

    console.log(`--- Success! Report generated at: ${reportPath} ---`);
    process.exit(0);
  } catch (err) {
    console.error('Error extracting schema:', err);
    process.exit(1);
  }
}

extractSchema();

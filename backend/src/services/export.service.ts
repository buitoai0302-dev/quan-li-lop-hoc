import pool from '../db';
import fs from 'fs';

export const exportTenantData = async (tenantId: string, outputZipPath: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const archiverModule = await import('archiver');
      const archiver = archiverModule.default || archiverModule;

      const output = fs.createWriteStream(outputZipPath);
      const archive = (archiver as any)('zip', {
        zlib: { level: 9 }, // Sets the compression level.
      });

      output.on('close', () => {
        resolve();
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Fetch all tables where tenant_id = $1
      const tables = [
        { name: 'users', query: 'SELECT * FROM users WHERE tenant_id = $1' },
        { name: 'students', query: 'SELECT * FROM students WHERE tenant_id = $1' },
        { name: 'teachers', query: 'SELECT * FROM teachers WHERE tenant_id = $1' },
        { name: 'classes', query: 'SELECT * FROM classes WHERE tenant_id = $1' },
        { name: 'rooms', query: 'SELECT * FROM rooms WHERE tenant_id = $1' },
        { name: 'enrollments', query: 'SELECT * FROM enrollments WHERE tenant_id = $1' },
        {
          name: 'schedule_sessions',
          query: 'SELECT * FROM schedule_sessions WHERE tenant_id = $1',
        },
        { name: 'attendance', query: 'SELECT * FROM attendance WHERE tenant_id = $1' },
        { name: 'tuitions', query: 'SELECT * FROM tuitions WHERE tenant_id = $1' },
        { name: 'payments', query: 'SELECT * FROM payments WHERE tenant_id = $1' },
        { name: 'billing_invoices', query: 'SELECT * FROM billing_invoices WHERE tenant_id = $1' },
      ];

      for (const table of tables) {
        const result = await pool.query(table.query, [tenantId]);
        const dataStr = JSON.stringify(result.rows, null, 2);
        archive.append(dataStr, { name: `${table.name}.json` });
      }

      await archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
};

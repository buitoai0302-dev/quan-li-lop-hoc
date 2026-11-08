import pool from '../db';
import fs from 'fs';
import crypto from 'crypto';

// Business-data archive format: EDUBAK1 + 12-byte IV + ciphertext + 16-byte GCM tag.
// Credentials are intentionally omitted; a full database backup needs its own restore drill.
export const exportTenantData = async (tenantId: string, outputPath: string): Promise<void> => {
  const keyHex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error('BACKUP_ENCRYPTION_KEY must contain 32 bytes encoded as hex');
  }

  // Preserve native dynamic import: TypeScript's CommonJS output rewrites import() to require().
  const archiverModule = await (new Function('return import("archiver")') as () => Promise<any>)();
  const archive = new archiverModule.ZipArchive({ zlib: { level: 9 } });
  const output = fs.createWriteStream(outputPath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);

  const completed = new Promise<void>((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    cipher.on('error', reject);
    cipher.on('end', () => {
      output.write(cipher.getAuthTag());
      output.end();
    });
  });
  void completed.catch(() => {}); // Attach a handler while database queries are still running.

  output.write(Buffer.concat([Buffer.from('EDUBAK1'), iv]));
  archive.pipe(cipher).pipe(output, { end: false });

  try {
    const tables = [
      {
        name: 'tenants',
        query:
          'SELECT id, name, domain, contact_email, plan_id, status, is_active, settings, created_at FROM tenants WHERE id = $1',
      },
      { name: 'branches', query: 'SELECT * FROM branches WHERE tenant_id = $1' },
      {
        name: 'users',
        query: `SELECT id, tenant_id, branch_id, email, full_name, role, is_active,
        is_email_verified, onboarding_completed, created_at, updated_at FROM users WHERE tenant_id = $1`,
      },
      { name: 'students', query: 'SELECT * FROM students WHERE tenant_id = $1' },
      { name: 'teachers', query: 'SELECT * FROM teachers WHERE tenant_id = $1' },
      { name: 'subjects', query: 'SELECT * FROM subjects WHERE tenant_id = $1' },
      { name: 'classes', query: 'SELECT * FROM classes WHERE tenant_id = $1' },
      { name: 'rooms', query: 'SELECT * FROM rooms WHERE tenant_id = $1' },
      { name: 'class_students', query: 'SELECT * FROM class_students WHERE tenant_id = $1' },
      {
        name: 'class_recurring_schedules',
        query: `SELECT crs.* FROM class_recurring_schedules crs
        JOIN classes c ON c.id = crs.class_id WHERE c.tenant_id = $1`,
      },
      { name: 'schedule_sessions', query: 'SELECT * FROM schedule_sessions WHERE tenant_id = $1' },
      { name: 'attendance', query: 'SELECT * FROM attendance WHERE tenant_id = $1' },
      { name: 'tuitions', query: 'SELECT * FROM tuitions WHERE tenant_id = $1' },
      { name: 'payments', query: 'SELECT * FROM payments WHERE tenant_id = $1' },
      { name: 'plan_requests', query: 'SELECT * FROM plan_requests WHERE tenant_id = $1' },
      { name: 'billing_invoices', query: 'SELECT * FROM billing_invoices WHERE tenant_id = $1' },
    ];

    for (const table of tables) {
      const result = await pool.query(table.query, [tenantId]);
      archive.append(JSON.stringify(result.rows), { name: `${table.name}.json` });
    }
    await archive.finalize();
    await completed;
  } catch (error) {
    archive.abort();
    cipher.destroy();
    output.destroy();
    await fs.promises.rm(outputPath, { force: true });
    throw error;
  }
};

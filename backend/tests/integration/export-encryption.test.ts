import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

describe('Tenant export encryption', () => {
  it('writes an authenticated encrypted ZIP and rejects a changed ciphertext', async () => {
    const previousKey = process.env.BACKUP_ENCRYPTION_KEY;
    process.env.BACKUP_ENCRYPTION_KEY = 'a'.repeat(64);
    const directory = fs.mkdtempSync(path.join(process.cwd(), '.backup-test-'));
    const file = path.join(directory, 'sample.zip.enc');
    try {
      execFileSync(process.execPath, ['-r', 'ts-node/register', '-e', `
        const pool = require('./src/db').default;
        pool.query = async () => ({ rows: [] });
        const { exportTenantData } = require('./src/services/export.service');
        exportTenantData('tenant-a', process.env.BACKUP_TEST_OUTPUT)
          .then(() => pool.end()).catch((error) => { console.error(error); process.exitCode = 1; });
      `], {
        cwd: process.cwd(),
        env: { ...process.env, BACKUP_TEST_OUTPUT: file },
        stdio: 'pipe',
      });
      const data = fs.readFileSync(file);
      expect(data.subarray(0, 7).toString()).toBe('EDUBAK1');
      const decrypt = (contents: Buffer) => {
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm', Buffer.from(process.env.BACKUP_ENCRYPTION_KEY!, 'hex'),
          contents.subarray(7, 19)
        );
        decipher.setAuthTag(contents.subarray(contents.length - 16));
        return Buffer.concat([
          decipher.update(contents.subarray(19, contents.length - 16)), decipher.final(),
        ]);
      };
      expect(decrypt(data).subarray(0, 2).toString()).toBe('PK');
      const tampered = Buffer.from(data);
      tampered[20] ^= 1;
      expect(() => decrypt(tampered)).toThrow();
    } finally {
      if (!path.resolve(directory).startsWith(path.resolve(process.cwd()) + path.sep)) {
        throw new Error('Refusing to remove a test directory outside the backend workspace');
      }
      fs.rmSync(directory, { recursive: true, force: true });
      if (previousKey === undefined) delete process.env.BACKUP_ENCRYPTION_KEY;
      else process.env.BACKUP_ENCRYPTION_KEY = previousKey;
    }
  });
});

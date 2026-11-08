import pool from '../../src/db';
import boss from '../../src/cron/queue';
import { initBackupJobs } from '../../src/cron/backup.cron';
import { exportTenantData } from '../../src/services/export.service';
import { uploadBackupToDrive } from '../../src/services/google.service';

jest.mock('../../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock('../../src/cron/queue', () => ({
  __esModule: true, default: { work: jest.fn(), schedule: jest.fn() },
}));
jest.mock('../../src/services/export.service');
jest.mock('../../src/services/google.service', () => ({ uploadBackupToDrive: jest.fn() }));

afterEach(() => jest.useRealTimers());

it('reads supported tenant columns and records completion only after uploading the encrypted backup', async () => {
  jest.useFakeTimers({ now: new Date(2030, 0, 1, 9) });
  const settings = { backup: { enabled: true, time: '09:00', cycle: 'daily' } };
  const query = jest.mocked(pool.query);
  query.mockResolvedValueOnce({ rows: [{ id: 'super-admin' }] } as never);
  query.mockResolvedValueOnce({ rows: [{ id: 'tenant-a', settings }] } as never);

  await initBackupJobs();
  const run = (boss.work as jest.Mock).mock.calls[0][1] as () => Promise<void>;
  jest.mocked(uploadBackupToDrive).mockImplementation(async () => {
    expect(query).toHaveBeenCalledTimes(2);
    return 'drive-file';
  });
  await run();

  expect(query).toHaveBeenNthCalledWith(2, 'SELECT id, settings FROM tenants');
  expect(exportTenantData).toHaveBeenCalledWith('tenant-a', expect.stringMatching(/\.zip\.enc$/));
  expect(uploadBackupToDrive).toHaveBeenCalledWith(
    'super-admin', 'tenant_tenant-a', expect.stringMatching(/\.zip\.enc$/), expect.stringMatching(/\.zip\.enc$/)
  );
  expect(query).toHaveBeenNthCalledWith(
    3, 'UPDATE tenants SET settings = $1 WHERE id = $2',
    [expect.stringContaining('last_backup_at'), 'tenant-a']
  );
});

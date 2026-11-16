import pool from '../../src/db';
import {
  isAuthSchemaReady,
  isScheduleSchemaReady,
  isWorkflowSchemaReady,
} from '../../src/services/readiness.service';

jest.mock('../../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));

it('accepts the complete authentication schema', async () => {
  (pool.query as jest.Mock).mockResolvedValue({ rows: [{ ready: true }] });
  await expect(isAuthSchemaReady()).resolves.toBe(true);
});

it('keeps a database with missing auth schema out of readiness', async () => {
  (pool.query as jest.Mock).mockResolvedValue({ rows: [{ ready: false }] });
  await expect(isAuthSchemaReady()).resolves.toBe(false);
});

it('does not report readiness when the database is unavailable', async () => {
  (pool.query as jest.Mock).mockRejectedValue(new Error('Fixture database unavailable'));
  await expect(isAuthSchemaReady()).rejects.toThrow('Fixture database unavailable');
});

it.each([true, false])('requires all three schedule exclusions (ready: %s)', async (ready) => {
  (pool.query as jest.Mock).mockResolvedValue({ rows: [{ ready }] });
  await expect(isScheduleSchemaReady()).resolves.toBe(ready);
});
it.each([true, false])(
  'requires the workflow tables, columns and all enabled sync triggers (ready: %s)',
  async (ready) => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ ready }] });
    await expect(isWorkflowSchemaReady()).resolves.toBe(ready);
  }
);

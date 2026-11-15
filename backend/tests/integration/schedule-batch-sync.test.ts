import pool from '../../src/db';
import { ScheduleService } from '../../src/services/schedule.service';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: { connect: jest.fn(), query: jest.fn() },
}));

it('returns the batch only after its transaction commits (outbox is queued by DB triggers)', async () => {
  const writes: string[] = [];
  const slot = {
    classId: '11111111-1111-4111-8111-111111111111',
    roomId: '22222222-2222-4222-8222-222222222222',
    teacherId: '33333333-3333-4333-8333-333333333333',
    sessionDate: '2026-11-12',
    startTime: '10:00',
    endTime: '11:00',
  };
  const session = { id: 'saved-session', session_date: slot.sessionDate };
  const client = {
    query: jest.fn(async (sql: string, params?: [string, string[]]) => {
      writes.push(sql);
      if (sql.startsWith('SELECT id FROM')) {
        return { rows: params?.[1].map((id) => ({ id })) };
      }
      return { rows: sql.includes('INSERT INTO') ? [session] : [] };
    }),
    release: jest.fn(),
  };
  (pool.connect as jest.Mock).mockResolvedValue(client);
  await expect(ScheduleService.createSessions('tenant', 'user', [slot])).resolves.toEqual([
    session,
  ]);
  expect(writes[0]).toBe('BEGIN');
  expect(writes[writes.length - 1]).toBe('COMMIT');
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(pool.query).not.toHaveBeenCalled();
});

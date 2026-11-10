import pool from '../../src/db';
import { ScheduleService } from '../../src/services/schedule.service';
import { syncEventToGoogle } from '../../src/services/google.service';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: { connect: jest.fn(), query: jest.fn() },
}));
jest.mock('../../src/services/google.service', () => ({
  syncEventToGoogle: jest.fn(),
  deleteEventFromGoogle: jest.fn(),
}));

it('returns the committed batch while Google Calendar is still syncing', async () => {
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
  (pool.query as jest.Mock).mockImplementation(async () => {
    expect(writes.at(-1)).toBe('COMMIT');
    return { rows: [session] };
  });
  let finishSync!: () => void;
  const sync = new Promise<void>((resolve) => { finishSync = resolve; });
  jest.mocked(syncEventToGoogle).mockReturnValue(sync);
  try {
    await expect(ScheduleService.createSessions('tenant', 'user', [slot])).resolves.toEqual([session]);
    expect(syncEventToGoogle).toHaveBeenCalledWith('user', expect.objectContaining({ id: session.id }));
    expect(client.release).toHaveBeenCalledTimes(1);
  } finally {
    finishSync();
  }
});

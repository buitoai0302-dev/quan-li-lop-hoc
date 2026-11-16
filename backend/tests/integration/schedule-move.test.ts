import pool from '../../src/db';
import { ScheduleService } from '../../src/services/schedule.service';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: { connect: jest.fn(), query: jest.fn() },
}));

const STORED_SESSION = {
  id: 'session',
  tenant_id: 'tenant',
  session_date: '2026-11-14',
  start_time: '08:00:00',
  end_time: '10:00:00',
  room_id: 'room',
  teacher_id: 'teacher',
  class_id: 'class',
  session_type: 'makeup',
  notes: 'Preserve this note',
};

function mockScheduleClient(conflicts: Array<{ conflict_type: string }> = []) {
  const client = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM schedule_sessions') && sql.includes('FOR UPDATE')) {
        return { rows: [STORED_SESSION] };
      }
      if (sql.includes('check_schedule_conflict')) return { rows: conflicts };
      if (sql.includes('UPDATE schedule_sessions')) {
        return { rows: [{ ...STORED_SESSION, session_date: '2026-11-15' }] };
      }
      return { rows: [] };
    }),
    release: jest.fn(),
  };
  jest.mocked(pool.connect).mockResolvedValue(client as never);
  return client;
}

it('moves only the date, using the locked session fields and committing before returning', async () => {
  const client = mockScheduleClient();

  const result = await ScheduleService.updateSession('tenant', 'user', 'session', {
    sessionDate: '2026-11-15',
  });

  expect(result).toEqual({
    success: true,
    data: { ...STORED_SESSION, session_date: '2026-11-15' },
  });
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('check_schedule_conflict'), [
    'tenant',
    'teacher',
    'room',
    'class',
    '2026-11-15',
    '08:00:00',
    '10:00:00',
    'session',
  ]);
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE schedule_sessions'), [
    '2026-11-15',
    '08:00:00',
    '10:00:00',
    'room',
    'teacher',
    'class',
    'makeup',
    'Preserve this note',
    'session',
    'tenant',
  ]);
  expect(client.query).toHaveBeenLastCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalledTimes(1);
});

it('rolls back a conflicting move without updating the session or syncing Google', async () => {
  const conflicts = [{ conflict_type: 'ROOM_CONFLICT' }];
  const client = mockScheduleClient(conflicts);

  await expect(
    ScheduleService.updateSession('tenant', 'user', 'session', {
      sessionDate: '2026-11-15',
    })
  ).resolves.toEqual({ success: false, conflicts });

  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(client.query.mock.calls.some(([sql]) => sql.includes('UPDATE schedule_sessions'))).toBe(
    false
  );
  expect(client.release).toHaveBeenCalledTimes(1);
});

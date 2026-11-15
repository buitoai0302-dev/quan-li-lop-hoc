import pool from '../../src/db';
import { google } from 'googleapis';
import { syncEventToGoogle, syncAllSessionsToGoogle } from '../../src/services/google.service';

jest.mock('../../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock('../../src/utils/config', () => ({
  config: {
    google: {
      clientId: () => 'fixture-client-id',
      clientSecret: () => 'fixture-client-secret',
      redirectUri: () => 'http://localhost/api/google/callback',
    },
  },
}));
jest.mock('googleapis', () => ({
  google: {
    auth: { OAuth2: jest.fn(() => ({ setCredentials: jest.fn() })) },
    calendar: jest.fn(),
  },
}));

const query = pool.query as jest.Mock;
const events = { insert: jest.fn(), update: jest.fn(), delete: jest.fn() };
const session = {
  class_name: 'QA class',
  room_name: 'QA room',
  teacher_name: 'QA teacher',
  teacher_email: 'teacher@example.test',
  session_date: '2090-01-02',
  start_time: '08:00:00',
  end_time: '09:00:00',
  google_event_id: null,
  notes: null,
};

beforeEach(() => {
  jest.resetAllMocks();
  (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
    setCredentials: jest.fn(),
  }));
  jest
    .mocked(google.calendar)
    .mockImplementation(() => ({ events }) as unknown as ReturnType<typeof google.calendar>);
});

it('removes the newly created Google event if the session was cancelled during insertion', async () => {
  query
    .mockResolvedValueOnce({ rows: [{ google_access_token: 'fixture-token' }] })
    .mockResolvedValueOnce({ rows: [session] })
    .mockResolvedValueOnce({ rows: [] });
  events.insert.mockResolvedValue({ data: { id: 'new-event' } });

  await syncEventToGoogle('user', 'tenant', 'session');

  expect(events.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      requestBody: expect.objectContaining({
        start: { dateTime: '2090-01-02T01:00:00.000Z', timeZone: 'Asia/Ho_Chi_Minh' },
      }),
    })
  );
  expect(query).toHaveBeenNthCalledWith(
    3,
    expect.stringContaining('AND status <> $4 AND google_event_id IS NULL'),
    ['tenant', 'session', 'new-event', 'cancelled']
  );
  expect(events.delete).toHaveBeenCalledWith({ calendarId: 'primary', eventId: 'new-event' });
});

it('updates the linked event with current session details when another sync is already running', async () => {
  query
    .mockResolvedValueOnce({ rows: [{ google_access_token: 'fixture-token' }] })
    .mockResolvedValueOnce({ rows: [session] })
    .mockResolvedValueOnce({ rows: [{ id: 'session' }] })
    .mockResolvedValueOnce({ rows: [{ google_access_token: 'fixture-token' }] })
    .mockResolvedValueOnce({
      rows: [{ ...session, google_event_id: 'new-event', start_time: '08:30:00' }],
    });
  events.insert.mockResolvedValue({ data: { id: 'new-event' } });

  await Promise.all([
    syncEventToGoogle('user', 'tenant', 'session'),
    syncEventToGoogle('user', 'tenant', 'session'),
  ]);

  expect(events.insert).toHaveBeenCalledTimes(1);
  expect(events.update).toHaveBeenCalledWith(
    expect.objectContaining({
      eventId: 'new-event',
      requestBody: expect.objectContaining({
        start: { dateTime: '2090-01-02T01:30:00.000Z', timeZone: 'Asia/Ho_Chi_Minh' },
      }),
    })
  );
  expect(events.delete).not.toHaveBeenCalled();
});

it('manual sync updates linked events, uses Vietnam time and counts only successful writes', async () => {
  query
    .mockResolvedValueOnce({ rows: [{ google_refresh_token: 'fixture-refresh' }] })
    .mockResolvedValueOnce({ rows: [{ id: 'session' }, { id: 'failed-session' }] })
    .mockResolvedValueOnce({ rows: [{ google_refresh_token: 'fixture-refresh' }] })
    .mockResolvedValueOnce({ rows: [{ ...session, google_event_id: 'existing-event' }] })
    .mockResolvedValueOnce({ rows: [{ google_refresh_token: 'fixture-refresh' }] })
    .mockResolvedValueOnce({ rows: [{ ...session, google_event_id: 'failed-event' }] });
  events.update
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('Synthetic provider failure'));
  await expect(syncAllSessionsToGoogle('user', 'tenant')).resolves.toBe(1);
  expect(events.insert).not.toHaveBeenCalled();
  expect(events.update).toHaveBeenCalledWith(
    expect.objectContaining({
      eventId: 'existing-event',
      requestBody: expect.objectContaining({
        start: { dateTime: '2090-01-02T01:00:00.000Z', timeZone: 'Asia/Ho_Chi_Minh' },
      }),
    })
  );
  expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('WHERE s.tenant_id = $2'), [
    'user',
    'tenant',
    'cancelled',
    'teacher',
  ]);
  expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('tenant_id = $2'), [
    'user',
    'tenant',
  ]);
});

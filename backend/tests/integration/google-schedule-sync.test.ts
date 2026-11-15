import {
  CalendarEventDeletedError,
  CalendarOwnershipError,
  canAdoptLegacyEvent,
  getGoogleFailure,
  writePersonalEvent,
} from '../../src/services/google-calendar-provider.service';
import type { calendar_v3 } from 'googleapis';
const link = {
  id: 'link',
  tenant_id: 'tenant',
  user_id: 'user',
  session_id: 'session',
  event_id: 'abc123',
  legacy_event_id: null,
  legacy_confirmed: false,
};
const payload = {
  date: '2090-01-02',
  startTime: '08:00:00',
  endTime: '09:00:00',
  className: 'QA class',
  roomName: 'QA room',
  teacherName: 'QA teacher',
  notes: '',
};
const owned = {
  id: link.event_id,
  extendedProperties: { private: { eduTenant: 'tenant', eduUser: 'user', eduSession: 'session' } },
};
function fixture() {
  const events = { get: jest.fn(), insert: jest.fn(), patch: jest.fn(), delete: jest.fn() };
  return { events, calendar: { events } as unknown as calendar_v3.Calendar };
}
it('uses a persisted ID and Vietnam time without adding attendees', async () => {
  const { events, calendar } = fixture();
  events.get.mockRejectedValue({ code: 404 });
  events.insert.mockResolvedValue({ data: { id: 'abc123' } });
  await writePersonalEvent(calendar, link, payload, '1');
  const body = events.insert.mock.calls[0][0].requestBody;
  expect(body).toMatchObject({
    id: 'abc123',
    start: { dateTime: '2090-01-02T08:00:00+07:00', timeZone: 'Asia/Ho_Chi_Minh' },
    extendedProperties: { private: { eduRevision: '1' } },
  });
  expect(body.attendees).toBeUndefined();
});
it('verifies ownership after duplicate insert and never overwrites a foreign event', async () => {
  const { events, calendar } = fixture();
  events.get.mockRejectedValueOnce({ code: 404 }).mockResolvedValueOnce({ data: owned });
  events.insert.mockRejectedValue({ code: 409 });
  events.patch.mockResolvedValue({});
  await writePersonalEvent(calendar, link, payload, '2');
  expect(events.patch).toHaveBeenCalledTimes(1);
  events.get.mockResolvedValue({ data: { id: 'abc123' } });
  events.patch.mockClear();
  await expect(writePersonalEvent(calendar, link, payload, '3')).rejects.toBeInstanceOf(
    CalendarOwnershipError
  );
  expect(events.patch).not.toHaveBeenCalled();
});
it('treats a missing deletion as complete and categorizes provider errors', async () => {
  const { events, calendar } = fixture();
  events.get.mockRejectedValue({ code: 404 });
  await writePersonalEvent(calendar, link, null, '2');
  expect(events.delete).not.toHaveBeenCalled();
  expect(
    getGoogleFailure({
      response: { status: 403, data: { error: { errors: [{ reason: 'userRateLimitExceeded' }] } } },
    }).transient
  ).toBe(true);
  expect(
    getGoogleFailure({ response: { status: 400, data: { error: 'invalid_grant' } } }).auth
  ).toBe(true);
  expect(getGoogleFailure({ code: 400 }).transient).toBe(false);
  expect(getGoogleFailure({ code: 'ECONNRESET' }).transient).toBe(true);
});
it('requires a new persisted ID for tombstones without altering the deleted event', async () => {
  const { events, calendar } = fixture();
  events.get.mockResolvedValue({ data: { id: link.event_id, status: 'cancelled' } });
  await expect(writePersonalEvent(calendar, link, payload, '4')).rejects.toBeInstanceOf(
    CalendarEventDeletedError
  );
  await writePersonalEvent(calendar, link, null, '4');
  expect(events.patch).not.toHaveBeenCalled();
  expect(events.delete).not.toHaveBeenCalled();
  events.get.mockRejectedValue({ code: 410 });
  await expect(writePersonalEvent(calendar, link, payload, '4')).rejects.toBeInstanceOf(
    CalendarEventDeletedError
  );
});
it('never adopts a shared, recurring, or differently marked legacy event', () => {
  const personal = { organizer: { self: true }, creator: { self: true } };
  expect(canAdoptLegacyEvent(personal)).toBe(true);
  for (const event of [
    { ...personal, attendees: [{ email: 'other@example.test' }] },
    { ...personal, recurrence: ['RRULE:FREQ=DAILY'] },
    { ...personal, extendedProperties: { private: { eduUser: 'other' } } },
  ])
    expect(canAdoptLegacyEvent(event)).toBe(false);
});

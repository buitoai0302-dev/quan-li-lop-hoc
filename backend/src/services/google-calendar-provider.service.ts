import { google, type calendar_v3 } from 'googleapis';
import { config } from '../utils/config';
import { GOOGLE_SYNC, type CalendarLink, type CalendarPayload } from '../utils/google-sync';
import { VIETNAM_TIME_ZONE } from '../utils/constants';

export class CalendarOwnershipError extends Error {}
export class CalendarEventDeletedError extends Error {}
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function getGoogleFailure(error: unknown): {
  status: number;
  reason: string;
  transient: boolean;
  auth: boolean;
} {
  const value = asRecord(error);
  const response = asRecord(value.response);
  const statusValue = response.status || value.code;
  const status =
    typeof statusValue === 'number' || typeof statusValue === 'string' ? Number(statusValue) : 0;
  const detail = asRecord(response.data).error;
  const errors = asRecord(detail).errors;
  const reasonValue = Array.isArray(errors) ? asRecord(errors[0]).reason : undefined;
  const reason =
    typeof detail === 'string' ? detail : typeof reasonValue === 'string' ? reasonValue : '';
  return {
    status,
    reason,
    auth: status === 401 || reason === 'invalid_grant',
    transient:
      !Number.isFinite(status) ||
      status === 0 ||
      status === 429 ||
      status >= 500 ||
      ['rateLimitExceeded', 'userRateLimitExceeded', 'backendError'].includes(reason),
  };
}
export function getPersonalCalendar(accessToken: string | null, refreshToken: string | null) {
  const auth = new google.auth.OAuth2({
    clientId: config.google.clientId(),
    clientSecret: config.google.clientSecret(),
    transporterOptions: { timeout: GOOGLE_SYNC.REQUEST_TIMEOUT_MS, retry: false },
  });
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth });
}
const REQUEST_OPTIONS = { timeout: GOOGLE_SYNC.REQUEST_TIMEOUT_MS, retry: false };
export async function getCalendarEvent(calendar: calendar_v3.Calendar, eventId: string) {
  try {
    return (
      await calendar.events.get(
        { calendarId: GOOGLE_SYNC.PRIMARY_CALENDAR, eventId },
        REQUEST_OPTIONS
      )
    ).data;
  } catch (error) {
    const { status } = getGoogleFailure(error);
    if (status === 404) return null;
    if (status === 410) return { id: eventId, status: 'cancelled' };
    throw error;
  }
}
export function ownsCalendarEvent(event: calendar_v3.Schema$Event, link: CalendarLink) {
  const data = event.extendedProperties?.private;
  return (
    data?.eduTenant === link.tenant_id &&
    data?.eduUser === link.user_id &&
    data?.eduSession === link.session_id
  );
}
export function canAdoptLegacyEvent(event: calendar_v3.Schema$Event) {
  const properties = event.extendedProperties?.private;
  return (
    event.status !== 'cancelled' &&
    event.organizer?.self &&
    event.creator?.self &&
    !event.attendees?.length &&
    !event.recurringEventId &&
    !event.recurrence?.length &&
    !properties?.eduTenant &&
    !properties?.eduUser &&
    !properties?.eduSession
  );
}
function eventBody(
  link: CalendarLink,
  payload: CalendarPayload,
  revision: string
): calendar_v3.Schema$Event {
  return {
    summary: payload.className,
    location: payload.roomName,
    description: [payload.teacherName, payload.notes, 'EduSchedule'].filter(Boolean).join('\n'),
    start: { dateTime: `${payload.date}T${payload.startTime}+07:00`, timeZone: VIETNAM_TIME_ZONE },
    end: { dateTime: `${payload.date}T${payload.endTime}+07:00`, timeZone: VIETNAM_TIME_ZONE },
    extendedProperties: {
      private: {
        eduTenant: link.tenant_id,
        eduUser: link.user_id,
        eduSession: link.session_id,
        eduRevision: revision,
      },
    },
  };
}
export async function writePersonalEvent(
  calendar: calendar_v3.Calendar,
  link: CalendarLink,
  payload: CalendarPayload | null,
  revision: string
) {
  let existing = await getCalendarEvent(calendar, link.event_id);
  if (existing?.status === 'cancelled') {
    if (!payload) return;
    throw new CalendarEventDeletedError();
  }
  if (existing && !ownsCalendarEvent(existing, link)) throw new CalendarOwnershipError();
  if (!payload) {
    if (existing)
      try {
        await calendar.events.delete(
          { calendarId: GOOGLE_SYNC.PRIMARY_CALENDAR, eventId: link.event_id, sendUpdates: 'none' },
          REQUEST_OPTIONS
        );
      } catch (error) {
        if (![404, 410].includes(getGoogleFailure(error).status)) throw error;
      }
    return;
  }
  const body = eventBody(link, payload, revision);
  if (!existing) {
    try {
      await calendar.events.insert(
        {
          calendarId: GOOGLE_SYNC.PRIMARY_CALENDAR,
          requestBody: { ...body, id: link.event_id },
          sendUpdates: 'none',
        },
        REQUEST_OPTIONS
      );
      return;
    } catch (error) {
      if (getGoogleFailure(error).status !== 409) throw error;
      existing = await getCalendarEvent(calendar, link.event_id);
      if (existing?.status === 'cancelled') throw new CalendarEventDeletedError();
      if (!existing || !ownsCalendarEvent(existing, link)) throw new CalendarOwnershipError();
    }
  }
  try {
    await calendar.events.patch(
      {
        calendarId: GOOGLE_SYNC.PRIMARY_CALENDAR,
        eventId: link.event_id,
        requestBody: body,
        sendUpdates: 'none',
      },
      REQUEST_OPTIONS
    );
  } catch (error) {
    if ([404, 410].includes(getGoogleFailure(error).status)) throw new CalendarEventDeletedError();
    throw error;
  }
}

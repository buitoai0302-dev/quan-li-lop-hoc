export const GOOGLE_SYNC_STATE = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  RETRY_NEEDED: 'retry_needed',
  CONNECTION_REQUIRED: 'connection_required',
  CONFIRMATION_REQUIRED: 'confirmation_required',
} as const;
export const GOOGLE_SYNC = {
  PRIMARY_CALENDAR: 'primary',
  MAX_RETRIES: 5,
  RETRY_DELAY_MS: 30000,
  REQUEST_TIMEOUT_MS: 10000,
  BATCH_SIZE: 20,
  JOB_NAME: 'google-calendar-outbox',
} as const;
export interface CalendarPayload {
  date: string;
  startTime: string;
  endTime: string;
  className: string;
  roomName: string;
  teacherName: string;
  notes: string;
}
export interface CalendarLink {
  id: string;
  tenant_id: string;
  user_id: string;
  session_id: string;
  event_id: string;
  legacy_event_id: string | null;
  legacy_confirmed: boolean;
}

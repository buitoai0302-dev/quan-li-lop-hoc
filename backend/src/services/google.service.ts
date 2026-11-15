import { logger } from '../utils/logger';
import { google, type calendar_v3 } from 'googleapis';
import pool from '../db';
import fs from 'fs';

import { config } from '../utils/config';
import { SESSION_STATUS, VIETNAM_TIME_ZONE, ERROR_CODES, ROLES } from '../utils/constants';
import { AppError, AuthenticationError } from '../utils/errors';
import { CodeChallengeMethod } from 'google-auth-library';

const PRIMARY_CALENDAR = 'primary';
const VIETNAM_UTC_OFFSET = '+07:00';
const pendingScheduleSyncs = new Map<string, Promise<boolean>>();

const oauth2Client = new google.auth.OAuth2(
  config.google.clientId(),
  config.google.clientSecret(),
  config.google.redirectUri()
);

export const getAuthUrl = (state: string, includeDrive: boolean, codeChallenge: string) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      ...(includeDrive ? ['https://www.googleapis.com/auth/drive.file'] : []),
    ],
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: 'consent', // Để luôn trả về refresh_token
  });
};

export const handleCallback = async (
  code: string,
  userId: string,
  tenantId: string,
  sessionVersion: number,
  codeVerifier: string
) => {
  const { tokens } = await oauth2Client.getToken({ code, codeVerifier });

  const result = await pool.query(
    `UPDATE users u SET google_access_token = $1,
       google_refresh_token = COALESCE($2, u.google_refresh_token)
     FROM tenants t
     WHERE u.id = $3 AND u.tenant_id = $4 AND u.session_version = $5
       AND t.id = u.tenant_id AND u.is_active = true AND (t.is_active = true OR u.role = $6)
     RETURNING u.id`,
    [tokens.access_token, tokens.refresh_token, userId, tenantId, sessionVersion, ROLES.SUPER_ADMIN]
  );
  if (result.rowCount !== 1) {
    throw new AuthenticationError(
      'Google connection session revoked',
      ERROR_CODES.GOOGLE_OAUTH_INVALID_STATE
    );
  }
};

const getClientForUser = async (userId: string, tenantId: string) => {
  const result = await pool.query(
    'SELECT google_access_token, google_refresh_token FROM users WHERE id = $1 AND tenant_id = $2 AND is_active = true',
    [userId, tenantId]
  );

  const user = result.rows[0];
  if (!user || (!user.google_access_token && !user.google_refresh_token)) return null;

  const client = new google.auth.OAuth2(config.google.clientId(), config.google.clientSecret());

  client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
  });

  return google.calendar({ version: 'v3', auth: client });
};

export const syncEventToGoogle = (userId: string, tenantId: string, sessionId: string) => {
  const previous = pendingScheduleSyncs.get(sessionId) ?? Promise.resolve();
  const pending = previous
    .then(() => syncScheduleEvent(userId, tenantId, sessionId))
    .finally(() => {
      if (pendingScheduleSyncs.get(sessionId) === pending) pendingScheduleSyncs.delete(sessionId);
    });
  pendingScheduleSyncs.set(sessionId, pending);
  return pending;
};

async function syncScheduleEvent(userId: string, tenantId: string, sessionId: string) {
  try {
    const calendar = await getClientForUser(userId, tenantId);
    if (!calendar) return false;

    const {
      rows: [session],
    } = await pool.query<{
      session_date: string;
      start_time: string;
      end_time: string;
      notes: string | null;
      google_event_id: string | null;
      class_name: string;
      room_name: string;
      teacher_name: string;
      teacher_email: string;
    }>(
      `SELECT s.session_date::text, s.start_time, s.end_time, s.notes, s.google_event_id,
              c.name AS class_name, r.name AS room_name,
              t.full_name AS teacher_name, t.email AS teacher_email
       FROM schedule_sessions s
       JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id AND c.is_deleted = false
       JOIN rooms r ON r.id = s.room_id AND r.tenant_id = s.tenant_id
       JOIN teachers t ON t.id = s.teacher_id AND t.tenant_id = s.tenant_id
       WHERE s.id = $1 AND s.tenant_id = $2 AND s.status <> $3`,
      [sessionId, tenantId, SESSION_STATUS.CANCELLED]
    );
    if (!session) return false;
    const {
      class_name: className,
      room_name: roomName,
      teacher_name: teacherName,
      teacher_email: teacherEmail,
      session_date: date,
      start_time: startTime,
      end_time: endTime,
      notes,
      google_event_id: existingEventId,
    } = session;

    const description = [
      `🎓 Lớp học (Class): ${className}`,
      `👨‍🏫 Giáo viên (Teacher): ${teacherName || 'Chưa chỉ định (Unassigned)'}`,
      `🏫 Phòng (Room): ${roomName}`,
      notes ? `📝 Ghi chú (Notes): ${notes}` : '',
      '------------------',
      '📅 Được đồng bộ tự động từ hệ thống quản lý EduSchedule',
      '📅 Automatically synced from EduSchedule Management System',
    ]
      .filter(Boolean)
      .join('\n');

    const event: calendar_v3.Schema$Event = {
      summary: `📚 [${className}] - Lịch học`,
      location: roomName,
      description,
      start: {
        dateTime: new Date(`${date}T${startTime}${VIETNAM_UTC_OFFSET}`).toISOString(),
        timeZone: VIETNAM_TIME_ZONE,
      },
      end: {
        dateTime: new Date(`${date}T${endTime}${VIETNAM_UTC_OFFSET}`).toISOString(),
        timeZone: VIETNAM_TIME_ZONE,
      },
      attendees: teacherEmail ? [{ email: teacherEmail }] : [],
      colorId: '5',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    if (existingEventId) {
      await calendar.events.update({
        calendarId: PRIMARY_CALENDAR,
        eventId: existingEventId,
        requestBody: event,
      });
      return true;
    }

    const {
      data: { id: eventId },
    } = await calendar.events.insert({
      calendarId: PRIMARY_CALENDAR,
      requestBody: event,
    });
    if (!eventId) return false;

    const linked = await pool.query(
      `UPDATE schedule_sessions SET google_event_id = $3
       WHERE tenant_id = $1 AND id = $2 AND status <> $4 AND google_event_id IS NULL
       RETURNING id`,
      [tenantId, sessionId, eventId, SESSION_STATUS.CANCELLED]
    );
    if (!linked.rows.length) {
      await calendar.events.delete({ calendarId: PRIMARY_CALENDAR, eventId });
      return false;
    }
    return true;
  } catch {
    logger.warn(
      { operation: 'GOOGLE_SCHEDULE_SYNC_FAILED', tenantId, sessionId },
      'Schedule Google sync failed after commit'
    );
    return false;
  }
}

export const deleteEventFromGoogle = async (
  userId: string,
  tenantId: string,
  sessionId: string
) => {
  try {
    const calendar = await getClientForUser(userId, tenantId);
    if (!calendar) return;

    const result = await pool.query(
      'SELECT google_event_id FROM schedule_sessions WHERE tenant_id = $1 AND id = $2',
      [tenantId, sessionId]
    );
    const eventId = result.rows[0]?.google_event_id;

    if (eventId) {
      await calendar.events.delete({
        calendarId: PRIMARY_CALENDAR,
        eventId: eventId,
      });

      await pool.query(
        'UPDATE schedule_sessions SET google_event_id = NULL WHERE tenant_id = $1 AND id = $2 AND google_event_id = $3',
        [tenantId, sessionId, eventId]
      );
    }
  } catch {
    logger.warn({ tenantId, sessionId }, 'Google Calendar event deletion failed');
  }
};

export const syncAllSessionsToGoogle = async (userId: string, tenantId: string) => {
  const calendar = await getClientForUser(userId, tenantId);
  if (!calendar) {
    throw new AppError(
      'Google Calendar is not connected',
      409,
      ERROR_CODES.GOOGLE_CONNECTION_FAILED
    );
  }
  const { rows } = await pool.query<{ id: string }>(
    `SELECT s.id
     FROM schedule_sessions s
     JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id AND c.is_deleted = false
     JOIN users u ON u.id = $1 AND u.tenant_id = s.tenant_id AND u.is_active = true
     WHERE s.tenant_id = $2 AND s.status <> $3
       AND (u.role <> $4 OR EXISTS (
         SELECT 1 FROM teachers t WHERE t.id = s.teacher_id AND t.tenant_id = s.tenant_id
           AND t.email = u.email AND t.is_deleted = false
       ))
     ORDER BY s.session_date, s.start_time, s.id`,
    [userId, tenantId, SESSION_STATUS.CANCELLED, ROLES.TEACHER]
  );
  let successCount = 0;
  for (const session of rows) {
    if (await syncEventToGoogle(userId, tenantId, session.id)) successCount++;
  }
  logger.info(
    {
      operation: 'GOOGLE_SCHEDULE_SYNC_COMPLETED',
      tenantId,
      userId,
      successCount,
      totalCount: rows.length,
    },
    'Calendar synchronization completed'
  );
  return successCount;
};

export const uploadBackupToDrive = async (
  userId: string,
  folderName: string,
  filePath: string,
  fileName: string
) => {
  const result = await pool.query(
    'SELECT google_access_token, google_refresh_token FROM users WHERE id = $1',
    [userId]
  );

  const user = result.rows[0];
  if (!user || (!user.google_access_token && !user.google_refresh_token)) {
    throw new Error('Google Drive not connected');
  }

  const client = new google.auth.OAuth2(config.google.clientId(), config.google.clientSecret());
  client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
  });

  const drive = google.drive({ version: 'v3', auth: client });

  // Find or create folder
  let folderId = null;
  try {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    if (res.data.files && res.data.files.length > 0) {
      folderId = res.data.files[0].id;
    } else {
      const folderRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = folderRes.data.id;
    }
  } catch (err) {
    logger.error(err, 'Error finding/creating folder:');
    throw err;
  }

  // Upload file
  try {
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
    };
    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });
    return file.data.id;
  } catch (err) {
    logger.error(err, 'Error uploading file to Drive:');
    throw err;
  }
};

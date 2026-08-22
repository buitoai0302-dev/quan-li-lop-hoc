import { logger } from '../utils/logger';
import { google } from 'googleapis';
import pool from '../db';
import fs from 'fs';

import { config } from '../utils/config';

const oauth2Client = new google.auth.OAuth2(
  config.google.clientId(),
  config.google.clientSecret(),
  config.google.redirectUri()
);

export const getAuthUrl = (state: string) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.file',
    ],
    state: state,
    prompt: 'consent', // Để luôn trả về refresh_token
  });
};

export const handleCallback = async (code: string, userId: string) => {
  const { tokens } = await oauth2Client.getToken(code);

  await pool.query(
    'UPDATE users SET google_access_token = $1, google_refresh_token = $2 WHERE id = $3',
    [tokens.access_token, tokens.refresh_token, userId]
  );

  return tokens;
};

const getClientForUser = async (userId: string) => {
  const result = await pool.query(
    'SELECT google_access_token, google_refresh_token FROM users WHERE id = $1',
    [userId]
  );

  const user = result.rows[0];
  if (!user || !user.google_access_token) return null;

  const client = new google.auth.OAuth2(config.google.clientId(), config.google.clientSecret());

  client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
  });

  return google.calendar({ version: 'v3', auth: client });
};

export const syncEventToGoogle = async (userId: string, sessionData: any) => {
  try {
    const calendar = await getClientForUser(userId);
    if (!calendar) return; // Không có liên kết Google

    // sessionData: id, className, roomName, date, startTime, endTime, teacherName, notes
    const { id, className, roomName, date, startTime, endTime, teacherName, notes } = sessionData;

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

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

    // Fetch teacher email for attendees
    let attendees = [];
    if (sessionData.teacherId) {
      const teacherRes = await pool.query('SELECT email FROM teachers WHERE id = $1', [
        sessionData.teacherId,
      ]);
      if (teacherRes.rows[0]?.email) {
        attendees.push({ email: teacherRes.rows[0].email });
      }
    }

    const event: any = {
      summary: `📚 [${className}] - Lịch học`,
      location: roomName,
      description: description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      attendees: attendees,
      colorId: '5',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    // Check if session already has a google_event_id
    const sessionRes = await pool.query(
      'SELECT google_event_id FROM schedule_sessions WHERE id = $1',
      [id]
    );
    const existingEventId = sessionRes.rows[0]?.google_event_id;

    let response;
    if (existingEventId) {
      // Update existing event
      response = await calendar.events.update({
        calendarId: 'primary',
        eventId: existingEventId,
        requestBody: event,
      });
    } else {
      // Insert new event
      response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      // Save the new event ID to database
      if (response.data.id) {
        await pool.query('UPDATE schedule_sessions SET google_event_id = $1 WHERE id = $2', [
          response.data.id,
          id,
        ]);
      }
    }
  } catch (error) {
    logger.error(error, 'Error syncing to Google Calendar:');
  }
};

export const deleteEventFromGoogle = async (userId: string, sessionId: string) => {
  try {
    const calendar = await getClientForUser(userId);
    if (!calendar) return;

    const result = await pool.query('SELECT google_event_id FROM schedule_sessions WHERE id = $1', [
      sessionId,
    ]);
    const eventId = result.rows[0]?.google_event_id;

    if (eventId) {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });

      // Clear the ID from DB
      await pool.query('UPDATE schedule_sessions SET google_event_id = NULL WHERE id = $1', [
        sessionId,
      ]);
    }
  } catch (error) {
    logger.error(error, 'Error deleting from Google Calendar:');
  }
};

export const syncAllSessionsToGoogle = async (userId: string, tenantId: string) => {
  const calendar = await getClientForUser(userId);
  if (!calendar) throw new Error('Google Calendar not connected');

  // Get user role first
  const userRoleRes = await pool.query('SELECT role, email FROM users WHERE id = $1', [userId]);
  const { role, email: userEmail } = userRoleRes.rows[0];

  // Lấy các buổi học chưa bị hủy
  // Nếu là giáo viên, chỉ lấy buổi học của chính họ
  let query = `
    SELECT s.id, 
           s.session_date::text as session_date,
           s.start_time,
           s.end_time,
           s.notes,
           COALESCE(c.name, 'Lớp học') as class_name, 
           COALESCE(r.name, 'Phòng học') as room_name,
           COALESCE(t.full_name, 'Chưa chỉ định') as teacher_name,
           t.email as teacher_email
    FROM schedule_sessions s
    JOIN users u ON s.tenant_id = u.tenant_id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN teachers t ON s.teacher_id = t.id
    WHERE u.id = $1 AND s.status != 'cancelled'
  `;

  if (role === 'teacher') {
    // Tìm teacher_id tương ứng với user này (giả định liên kết qua email hoặc một trường định danh)
    // Trong hệ thống này, teachers và users thường là 1 hoặc có liên kết email
    query += ` AND (t.email = $2 OR s.teacher_id = (SELECT id FROM teachers WHERE email = $2 LIMIT 1))`;
  }

  const result = await pool.query(query, role === 'teacher' ? [userId, userEmail] : [userId]);

  const sessions = result.rows;
  logger.info({ sessions }, `[GoogleSync] Found ${sessions.length} sessions in DB.`);
  let successCount = 0;

  for (const sessionData of sessions) {
    try {
      const { class_name, room_name, session_date, start_time, end_time, teacher_name, notes } =
        sessionData;
      const startDateTime = new Date(`${session_date}T${start_time}`);
      const endDateTime = new Date(`${session_date}T${end_time}`);

      const description = [
        `🎓 Lớp học (Class): ${class_name}`,
        `👨‍🏫 Giáo viên (Teacher): ${teacher_name}`,
        `🏫 Phòng (Room): ${room_name}`,
        notes ? `📝 Ghi chú (Notes): ${notes}` : '',
        '------------------',
        '📅 Được đồng bộ tự động từ hệ thống quản lý EduSchedule',
        '📅 Automatically synced from EduSchedule Management System',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `📚 [${class_name}] - Lịch học`,
          location: room_name,
          description: description,
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Asia/Ho_Chi_Minh',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Asia/Ho_Chi_Minh',
          },
          colorId: '5',
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'email', minutes: 60 },
            ],
          },
        },
      });

      if (response.data.id) {
        await pool.query('UPDATE schedule_sessions SET google_event_id = $1 WHERE id = $2', [
          response.data.id,
          sessionData.id,
        ]);
      }
      successCount++;
    } catch (err) {
      logger.error(err, `Failed to sync session ${sessionData.id}:`);
    }
  }

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

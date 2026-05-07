import { google } from 'googleapis';
import pool from '../db';

import { config } from '../utils/config';

const oauth2Client = new google.auth.OAuth2(
  config.google.clientId(),
  config.google.clientSecret(),
  config.google.redirectUri()
);

export const getAuthUrl = (state: string) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: state,
    prompt: 'consent' // Để luôn trả về refresh_token
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

  const client = new google.auth.OAuth2(
    config.google.clientId(),
    config.google.clientSecret()
  );
  
  client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token
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
      `🎓 Lớp học: ${className}`,
      `👨‍🏫 Giáo viên: ${teacherName || 'Chưa chỉ định'}`,
      `🏫 Phòng: ${roomName}`,
      notes ? `📝 Ghi chú: ${notes}` : '',
      '------------------',
      '📅 Được đồng bộ tự động từ hệ thống quản lý EduSchedule'
    ].filter(Boolean).join('\n');

    const event = {
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
      colorId: '5',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 }
        ]
      }
    };

    // Check if session already has a google_event_id
    const sessionRes = await pool.query('SELECT google_event_id FROM schedule_sessions WHERE id = $1', [id]);
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
        await pool.query('UPDATE schedule_sessions SET google_event_id = $1 WHERE id = $2', [response.data.id, id]);
      }
    }
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
  }
};

export const deleteEventFromGoogle = async (userId: string, sessionId: string) => {
  try {
    const calendar = await getClientForUser(userId);
    if (!calendar) return;

    const result = await pool.query('SELECT google_event_id FROM schedule_sessions WHERE id = $1', [sessionId]);
    const eventId = result.rows[0]?.google_event_id;

    if (eventId) {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
      
      // Clear the ID from DB
      await pool.query('UPDATE schedule_sessions SET google_event_id = NULL WHERE id = $1', [sessionId]);
    }
  } catch (error) {
    console.error('Error deleting from Google Calendar:', error);
  }
};

export const syncAllSessionsToGoogle = async (userId: string, tenantId: string) => {
  const calendar = await getClientForUser(userId);
  if (!calendar) throw new Error('Google Calendar not connected');

  // Lấy tất cả các buổi học chưa bị hủy của tenant này
  console.log(`[GoogleSync] Executing query for userId: ${userId}`);
  const result = await pool.query(`
    SELECT s.id, 
           s.session_date::text as session_date,
           s.start_time,
           s.end_time,
           s.notes,
           COALESCE(c.name, 'Lớp học') as class_name, 
           COALESCE(r.name, 'Phòng học') as room_name,
           COALESCE(t.full_name, 'Chưa chỉ định') as teacher_name
    FROM schedule_sessions s
    JOIN users u ON s.tenant_id = u.tenant_id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN teachers t ON s.teacher_id = t.id
    WHERE u.id = $1 AND s.status != 'cancelled'
  `, [userId]);

  const sessions = result.rows;
  console.log(`[GoogleSync] Found ${sessions.length} sessions in DB. Raw rows:`, JSON.stringify(sessions));
  let successCount = 0;

  for (const sessionData of sessions) {
    try {
      const { class_name, room_name, session_date, start_time, end_time, teacher_name, notes } = sessionData;
      const startDateTime = new Date(`${session_date}T${start_time}`);
      const endDateTime = new Date(`${session_date}T${end_time}`);

      const description = [
        `🎓 Lớp học: ${class_name}`,
        `👨‍🏫 Giáo viên: ${teacher_name}`,
        `🏫 Phòng: ${room_name}`,
        notes ? `📝 Ghi chú: ${notes}` : '',
        '------------------',
        '📅 Được đồng bộ tự động từ hệ thống quản lý EduSchedule'
      ].filter(Boolean).join('\n');

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
              { method: 'email', minutes: 60 }
            ]
          }
        },
      });

      if (response.data.id) {
        await pool.query('UPDATE schedule_sessions SET google_event_id = $1 WHERE id = $2', [response.data.id, sessionData.id]);
      }
      successCount++;
    } catch (err) {
      console.error(`Failed to sync session ${sessionData.id}:`, err);
    }
  }

  return successCount;
};

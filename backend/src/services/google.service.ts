import { google } from 'googleapis';
import pool from '../db';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/callback`
);

export const getAuthUrl = (userId: string) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: userId,
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
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
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

    // sessionData: id, className, roomName, date, startTime, endTime
    const { id, className, roomName, date, startTime, endTime } = sessionData;

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    const event = {
      summary: `[${className}] Lịch học`,
      location: roomName,
      description: `Lịch học được tạo từ EduSchedule`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      },
    };

    // Có thể cần lưu event_id vào schedule_sessions để update/delete sau này
    // Tạm thời chỉ insert
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
  }
};

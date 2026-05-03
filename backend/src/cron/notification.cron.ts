import cron from 'node-cron';
import pool from '../db';
import { sendReminderEmail } from '../services/email.service';

// Chạy mỗi 15 phút
export const initCronJobs = () => {
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Checking for upcoming sessions to notify...');
    
    try {
      const now = new Date();
      const in60Mins = new Date(now.getTime() + 60 * 60000);
      const in75Mins = new Date(now.getTime() + 75 * 60000);

      const targetDate = in60Mins.toISOString().split('T')[0];
      const targetTimeStart = in60Mins.toISOString().split('T')[1].substring(0, 8);
      const targetTimeEnd = in75Mins.toISOString().split('T')[1].substring(0, 8);

      // Lấy các session chưa được thông báo trong khung giờ sắp tới
      const sql = `
        SELECT DISTINCT s.id, s.session_date, s.start_time, c.name as class_name, r.name as room_name, 
               u.email as recipient_email, u.notify_upcoming_sessions
        FROM schedule_sessions s
        JOIN classes c ON s.class_id = c.id
        JOIN rooms r ON s.room_id = r.id
        LEFT JOIN teachers t ON s.teacher_id = t.id
        LEFT JOIN class_students cs ON s.class_id = cs.class_id
        LEFT JOIN students st ON cs.student_id = st.id
        JOIN users u ON (u.email = t.email OR u.email = st.email)
        WHERE s.session_date = $1 
          AND s.start_time >= $2 
          AND s.start_time < $3
          AND s.status != 'cancelled'
          AND s.is_notified = false
          AND u.notify_upcoming_sessions = true
      `;

      const result = await pool.query(sql, [targetDate, targetTimeStart, targetTimeEnd]);

      if (result.rows.length === 0) {
        console.log('[Cron] No sessions to notify.');
        return;
      }

      // Gửi email
      const sessionIds = new Set<string>();
      for (const recipient of result.rows) {
        await sendReminderEmail(recipient.recipient_email, {
          className: recipient.class_name,
          roomName: recipient.room_name,
          date: recipient.session_date,
          startTime: recipient.start_time
        });
        console.log(`[Cron] Sent reminder to ${recipient.recipient_email} for session ${recipient.id}`);
        sessionIds.add(recipient.id);
      }

      // Đánh dấu đã thông báo để tránh gửi trùng
      if (sessionIds.size > 0) {
        const ids = Array.from(sessionIds);
        await pool.query(
          `UPDATE schedule_sessions SET is_notified = true WHERE id = ANY($1)`,
          [ids]
        );
        console.log(`[Cron] Marked ${ids.length} session(s) as notified.`);
      }

    } catch (error) {
      console.error('[Cron] Error running notification job:', error);
    }
  });
  
  console.log('[Cron] Jobs initialized (runs every 15 minutes)');
};

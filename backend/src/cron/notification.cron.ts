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
        SELECT DISTINCT s.id, s.session_date, s.start_time, s.end_time,
               c.name as class_name, r.name as room_name, 
               u.email as recipient_email
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

      // Group by session_id, track which sessions had ALL emails sent successfully
      const sessionSuccess = new Map<string, boolean>();

      for (const recipient of result.rows) {
        const sessionId = recipient.id;
        // Initialize as true first time we see this session
        if (!sessionSuccess.has(sessionId)) {
          sessionSuccess.set(sessionId, true);
        }

        const sent = await sendReminderEmail(recipient.recipient_email, {
          className: recipient.class_name,
          roomName: recipient.room_name,
          date: recipient.session_date,
          startTime: recipient.start_time,
          endTime: recipient.end_time,
        });

        // If any email fails for this session, mark session as failed
        if (!sent) {
          sessionSuccess.set(sessionId, false);
          console.warn(
            `[Cron] Failed to send reminder to ${recipient.recipient_email} for session ${sessionId}`
          );
        } else {
          console.log(
            `[Cron] Sent reminder to ${recipient.recipient_email} for session ${sessionId}`
          );
        }
      }

      // Only mark sessions as notified if ALL their recipient emails were sent successfully
      const fullyNotifiedIds = Array.from(sessionSuccess.entries())
        .filter(([, success]) => success)
        .map(([id]) => id);

      if (fullyNotifiedIds.length > 0) {
        await pool.query(`UPDATE schedule_sessions SET is_notified = true WHERE id = ANY($1)`, [
          fullyNotifiedIds,
        ]);
        console.log(`[Cron] Marked ${fullyNotifiedIds.length} session(s) as notified.`);
      }

      const failedCount = sessionSuccess.size - fullyNotifiedIds.length;
      if (failedCount > 0) {
        console.warn(
          `[Cron] ${failedCount} session(s) had email failures and will retry next run.`
        );
      }
    } catch (error) {
      console.error('[Cron] Error running notification job:', error);
    }
  });

  console.log('[Cron] Jobs initialized (runs every 15 minutes)');
};

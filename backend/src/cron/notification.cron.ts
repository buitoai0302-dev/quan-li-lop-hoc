import { logger } from '../utils/logger';
/**
 * Notification Jobs — dùng pg-boss thay thế node-cron
 * Job được lưu vào DB, tự động chạy lại nếu server restart
 */
import boss from './queue';
import pool from '../db';
import { sendReminderEmail } from '../services/email.service';

const JOB_NAME = 'send-session-reminders';

// ─── Handler: gửi email nhắc nhở buổi học ───────────────────────────────────
async function sendSessionReminders() {
  logger.info('[Jobs] Checking for upcoming sessions to notify...');

  try {
    const now = new Date();
    const in60Mins = new Date(now.getTime() + 60 * 60000);
    const in75Mins = new Date(now.getTime() + 75 * 60000);

    const targetDate = in60Mins.toISOString().split('T')[0];
    const targetTimeStart = in60Mins.toISOString().split('T')[1].substring(0, 8);
    const targetTimeEnd = in75Mins.toISOString().split('T')[1].substring(0, 8);

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
      logger.info('[Jobs] No sessions to notify.');
      return;
    }

    const sessionSuccess = new Map<string, boolean>();

    for (const recipient of result.rows) {
      const sessionId = recipient.id;
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

      if (!sent) {
        sessionSuccess.set(sessionId, false);
        console.warn(
          `[Jobs] Failed to send reminder to ${recipient.recipient_email} for session ${sessionId}`
        );
      } else {
        logger.info(
          `[Jobs] Sent reminder to ${recipient.recipient_email} for session ${sessionId}`
        );
      }
    }

    const fullyNotifiedIds = Array.from(sessionSuccess.entries())
      .filter(([, success]) => success)
      .map(([id]) => id);

    if (fullyNotifiedIds.length > 0) {
      await pool.query(`UPDATE schedule_sessions SET is_notified = true WHERE id = ANY($1)`, [
        fullyNotifiedIds,
      ]);
      logger.info(`[Jobs] Marked ${fullyNotifiedIds.length} session(s) as notified.`);
    }

    const failedCount = sessionSuccess.size - fullyNotifiedIds.length;
    if (failedCount > 0) {
      console.warn(`[Jobs] ${failedCount} session(s) had email failures and will retry next run.`);
    }
  } catch (error) {
    logger.error(error, '[Jobs] Error running notification job:');
    throw error; // pg-boss sẽ retry tự động
  }
}

// ─── Khởi tạo scheduled job ──────────────────────────────────────────────────
export const initNotificationJobs = async () => {
  // Đăng ký worker xử lý job
  await boss.work(JOB_NAME, async () => {
    await sendSessionReminders();
  });

  // Lên lịch chạy mỗi 15 phút — pg-boss lưu lịch vào DB
  // Nếu server restart, lịch vẫn còn trong DB và chạy lại đúng giờ
  await boss.schedule(
    JOB_NAME,
    '*/15 * * * *',
    {},
    {
      tz: 'Asia/Ho_Chi_Minh',
    }
  );

  logger.info('[Jobs] Notification job scheduled (every 15 minutes, persistent)');
};

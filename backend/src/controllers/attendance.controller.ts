import { Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * Get attendance list for a specific session
 * Includes all students enrolled in the class of that session,
 * merged with existing attendance records.
 */
export const getAttendanceBySession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { sessionId } = req.params;

    // 1. Verify session exists, belongs to tenant AND attendance feature is enabled
    const sessionRes = await pool.query(
      `SELECT s.id, s.class_id, s.session_date, s.start_time, s.end_time, c.name as class_name,
              t.settings as tenant_settings
       FROM schedule_sessions s
       JOIN classes c ON s.class_id = c.id
       JOIN tenants t ON s.tenant_id = t.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [sessionId, tenantId]
    );

    if (sessionRes.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy buổi học', 'SESSION_NOT_FOUND');
    }

    const { class_id, tenant_settings } = sessionRes.rows[0];

    // Check feature gate
    if (tenant_settings?.menu?.attendance === false) {
      return res.status(403).json({
        success: false,
        error: 'FEATURE_DISABLED',
        message: 'Tính năng điểm danh chưa được kích hoạt cho trung tâm của bạn.',
      });
    }

    // 2. Get all students enrolled in this class and their attendance status for this session
    // LEFT JOIN ensures we get students who haven't been marked yet
    const attendanceRes = await pool.query(
      `SELECT 
        s.id as student_id, 
        s.full_name, 
        s.email,
        a.id as attendance_id,
        COALESCE(a.status, 'none') as status,
        a.created_at as marked_at
       FROM students s
       JOIN class_students cs ON s.id = cs.student_id
       LEFT JOIN attendance a ON s.id = a.student_id AND a.session_id = $1
       WHERE cs.class_id = $2 AND s.tenant_id = $3 AND s.is_deleted = false
       ORDER BY s.full_name`,
      [sessionId, class_id, tenantId]
    );

    res.json({
      session: sessionRes.rows[0],
      attendance: attendanceRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record or update attendance for multiple students in a session
 */
export const recordAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const tenantId = req.tenantId || req.user?.tenantId;
    const { sessionId } = req.params;
    const { records } = req.body; // Array of { student_id, status }

    if (!records || !Array.isArray(records)) {
      throw new ValidationError('Dữ liệu điểm danh không hợp lệ', 'INVALID_DATA');
    }

    // Verify session AND attendance feature gate
    const sessionRes = await client.query(
      `SELECT s.id, s.session_date, t.settings as tenant_settings 
       FROM schedule_sessions s
       JOIN tenants t ON s.tenant_id = t.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [sessionId, tenantId]
    );

    if (sessionRes.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy buổi học', 'SESSION_NOT_FOUND');
    }

    const { session_date, tenant_settings } = sessionRes.rows[0];

    // Check if session is NOT today (only allow marking for current date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(session_date);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() !== today.getTime()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'SESSION_DATE_RESTRICTED',
        message: 'Chỉ có thể điểm danh cho các buổi học diễn ra trong ngày hôm nay.',
      });
    }

    if (tenant_settings?.menu?.attendance === false) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'FEATURE_DISABLED',
        message: 'Tính năng điểm danh chưa được kích hoạt cho trung tâm của bạn.',
      });
    }

    const results = [];
    for (const record of records) {
      const { student_id, status } = record;

      // UPSERT attendance: Insert new or update existing if conflict on (session_id, student_id)
      const queryRes = await client.query(
        `INSERT INTO attendance (tenant_id, session_id, student_id, status, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (session_id, student_id) 
         DO UPDATE SET 
            status = EXCLUDED.status, 
            updated_at = NOW()
         RETURNING *`,
        [tenantId, sessionId, student_id, status]
      );
      results.push(queryRes.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ success: true, count: results.length });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Record attendance error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Internal Server Error',
      code: error.code || 'ATTENDANCE_ERROR',
    });
  } finally {
    if (client) client.release();
  }
};

import { Request, Response, NextFunction } from 'express';
import pool, { query } from '../db';
import { syncEventToGoogle } from '../services/google.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ValidationError, NotFoundError } from '../utils/errors';

export const getWeeklySchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { weekStart, startDate, endDate, branchId, teacherId, classId } = req.query;

    const queryStartDate = (startDate as string) || (weekStart as string);

    if (!queryStartDate) {
      throw new ValidationError('startDate or weekStart is required', 'MISSING_REQUIRED_FIELDS');
    }

    const userRole = req.user?.role;
    let userEmail = req.user?.email;

    if (!userEmail && req.user?.userId) {
      const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
      if (userRes.rows.length > 0) {
        userEmail = userRes.rows[0].email;
      }
    }

    let queryEndDate = endDate as string;
    if (!queryEndDate) {
      const tempDate = new Date(queryStartDate);
      tempDate.setDate(tempDate.getDate() + 6);
      queryEndDate = tempDate.toISOString().split('T')[0];
    }

    let sql = `
      SELECT s.*, 
             s.session_date::text as session_date,
             c.name as class_name, 
             t.full_name as teacher_name, 
             r.name as room_name,
             r.branch_id
      FROM schedule_sessions s
      JOIN classes c ON s.class_id = c.id AND c.is_deleted = false
      JOIN teachers t ON s.teacher_id = t.id AND t.is_deleted = false
      JOIN rooms r ON s.room_id = r.id AND r.is_deleted = false
      WHERE s.tenant_id = $1 
        AND s.session_date >= $2 
        AND s.session_date <= $3
        AND s.status != 'cancelled'
    `;
    const params: any[] = [tenantId, queryStartDate, queryEndDate];

    if (userRole === 'teacher') {
      const teacherRes = await pool.query('SELECT id FROM teachers WHERE email = $1 AND tenant_id = $2', [userEmail, tenantId]);
      if (teacherRes.rows.length > 0) {
        params.push(teacherRes.rows[0].id);
        sql += ` AND s.teacher_id = $${params.length}`;
      } else {
        res.json({ success: true, data: { startDate: queryStartDate, endDate: queryEndDate, sessions: [] } });
        return;
      }
    } else if (userRole === 'student') {
      const studentRes = await pool.query('SELECT id FROM students WHERE email = $1 AND tenant_id = $2', [userEmail, tenantId]);
      if (studentRes.rows.length > 0) {
        params.push(studentRes.rows[0].id);
        sql += ` AND s.class_id IN (SELECT class_id FROM class_students WHERE student_id = $${params.length})`;
      } else {
        res.json({ success: true, data: { startDate: queryStartDate, endDate: queryEndDate, sessions: [] } });
        return;
      }
    } else {
      if (teacherId) {
        params.push(teacherId);
        sql += ` AND s.teacher_id = $${params.length}`;
      }
      if (branchId) {
        params.push(branchId);
        sql += ` AND r.branch_id = $${params.length}`;
      }
      if (classId) {
        params.push(classId);
        sql += ` AND s.class_id = $${params.length}`;
      }
    }

    sql += ` ORDER BY s.session_date, s.start_time`;

    const result = await pool.query(sql, params);
    
    res.json({
      success: true,
      data: {
        startDate: queryStartDate,
        endDate: queryEndDate,
        sessions: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { classId, roomId, teacherId, sessionDate, startTime, endTime, sessionType, notes } = req.body;

    const conflictSql = `SELECT * FROM check_schedule_conflict($1, $2, $3, $4, $5, $6, $7)`;
    const conflictParams = [tenantId, teacherId, roomId, classId, sessionDate, startTime, endTime];
    
    const conflictResult = await pool.query(conflictSql, conflictParams);

    if (conflictResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'SCHEDULE_CONFLICT',
        conflicts: conflictResult.rows
      });
      return;
    }

    const insertSql = `
      INSERT INTO schedule_sessions 
        (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time, session_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *, session_date::text as session_date
    `;
    const insertParams = [tenantId, classId, roomId, teacherId, sessionDate, startTime, endTime, sessionType || 'lecture', notes || ''];

    const newSession = await pool.query(insertSql, insertParams);
    const sessionData = newSession.rows[0];

    const classRes = await pool.query('SELECT name FROM classes WHERE id = $1', [classId]);
    const roomRes = await pool.query('SELECT name FROM rooms WHERE id = $1', [roomId]);
    
    if (req.user?.userId) {
      await syncEventToGoogle(req.user.userId, {
        id: sessionData.id,
        className: classRes.rows[0]?.name || 'Class',
        roomName: roomRes.rows[0]?.name || 'Room',
        date: sessionData.session_date,
        startTime: sessionData.start_time,
        endTime: sessionData.end_time
      });
    }

    res.status(201).json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { classId, roomId, teacherId, sessionDate, startTime, endTime, sessionType, notes } = req.body;

    const getResult = await pool.query(`SELECT * FROM schedule_sessions WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    
    if (getResult.rows.length === 0) {
      throw new NotFoundError('Session not found', 'NOT_FOUND');
    }
    
    const session = getResult.rows[0];
    const newRoomId = roomId || session.room_id;
    const newTeacherId = teacherId || session.teacher_id;
    const newClassId = classId || session.class_id;
    const newSessionDate = sessionDate || session.session_date;
    const newStartTime = startTime || session.start_time;
    const newEndTime = endTime || session.end_time;
    
    const conflictSql = `SELECT * FROM check_schedule_conflict($1, $2, $3, $4, $5, $6, $7, $8)`;
    const conflictParams = [tenantId, newTeacherId, newRoomId, newClassId, newSessionDate, newStartTime, newEndTime, id];
    
    const conflictResult = await pool.query(conflictSql, conflictParams);

    if (conflictResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'SCHEDULE_CONFLICT',
        conflicts: conflictResult.rows
      });
      return;
    }

    const updateSql = `
      UPDATE schedule_sessions 
      SET session_date = $1, start_time = $2, end_time = $3, room_id = $4, teacher_id = $5, class_id = $6, session_type = $7, notes = $8
      WHERE id = $9 AND tenant_id = $10
      RETURNING *, session_date::text as session_date
    `;
    const updateParams = [newSessionDate, newStartTime, newEndTime, newRoomId, newTeacherId, newClassId, sessionType || session.session_type, notes !== undefined ? notes : session.notes, id, tenantId];

    const updatedSession = await pool.query(updateSql, updateParams);
    const sessionData = updatedSession.rows[0];

    const classRes = await pool.query('SELECT name FROM classes WHERE id = $1', [newClassId]);
    const roomRes = await pool.query('SELECT name FROM rooms WHERE id = $1', [newRoomId]);

    if (req.user?.userId) {
      await syncEventToGoogle(req.user.userId, {
        id: sessionData.id,
        className: classRes.rows[0]?.name || 'Class',
        roomName: roomRes.rows[0]?.name || 'Room',
        date: sessionData.session_date,
        startTime: sessionData.start_time,
        endTime: sessionData.end_time
      });
    }

    res.status(200).json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE schedule_sessions SET status = 'cancelled' WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Session not found', 'NOT_FOUND');
    }

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    next(error);
  }
};

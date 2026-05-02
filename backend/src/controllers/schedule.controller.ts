import { Request, Response } from 'express';
import { query } from '../db';

export const getWeeklySchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.id;
    const { weekStart, startDate, endDate, branchId, teacherId, classId } = req.query;

    const queryStartDate = (startDate as string) || (weekStart as string);

    if (!queryStartDate) {
      res.status(400).json({ success: false, message: 'startDate or weekStart is required' });
      return;
    }

    // Role-based filtering
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;
    let userEmail = (req as any).user?.email;

    if (!userEmail && userId) {
      const userRes = await query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        userEmail = userRes.rows[0].email;
      }
    }
    let queryEndDate = endDate as string;
    if (!queryEndDate) {
      // Default to 7 days if no endDate provided
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
      // Find teacher_id by email
      const teacherRes = await query('SELECT id FROM teachers WHERE email = $1', [userEmail]);
      if (teacherRes.rows.length > 0) {
        params.push(teacherRes.rows[0].id);
        sql += ` AND s.teacher_id = $${params.length}`;
      } else {
        // If teacher record not found, return empty
        res.json({ success: true, data: { startDate: queryStartDate, endDate: queryEndDate, sessions: [] } });
        return;
      }
    } else if (userRole === 'student') {
      // Find student_id by email
      const studentRes = await query('SELECT id FROM students WHERE email = $1', [userEmail]);
      if (studentRes.rows.length > 0) {
        params.push(studentRes.rows[0].id);
        sql += ` AND s.class_id IN (SELECT class_id FROM class_students WHERE student_id = $${params.length})`;
      } else {
        // If student record not found, return empty
        res.json({ success: true, data: { startDate: queryStartDate, endDate: queryEndDate, sessions: [] } });
        return;
      }
    } else {
      // Admins and Staff can view all, or apply requested filters
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

    const result = await query(sql, params);
    
    res.json({
      success: true,
      data: {
        startDate: queryStartDate,
        endDate: queryEndDate,
        sessions: result.rows
      }
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.id;
    const { classId, roomId, teacherId, sessionDate, startTime, endTime, sessionType, notes } = req.body;

    // 1. Conflict Detection
    const conflictSql = `
      SELECT * FROM check_schedule_conflict($1, $2, $3, $4, $5, $6, $7)
    `;
    const conflictParams = [tenantId, teacherId, roomId, classId, sessionDate, startTime, endTime];
    
    const conflictResult = await query(conflictSql, conflictParams);

    if (conflictResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'SCHEDULE_CONFLICT',
        conflicts: conflictResult.rows
      });
      return;
    }

    // 2. Insert if no conflict
    const insertSql = `
      INSERT INTO schedule_sessions 
        (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time, session_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *, session_date::text as session_date
    `;
    const insertParams = [tenantId, classId, roomId, teacherId, sessionDate, startTime, endTime, sessionType || 'lecture', notes || ''];

    const newSession = await query(insertSql, insertParams);

    res.status(201).json({
      success: true,
      data: newSession.rows[0]
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const updateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;
    const { classId, roomId, teacherId, sessionDate, startTime, endTime, sessionType, notes } = req.body;

    // 1. Get existing session to fallback values
    const getSql = `SELECT * FROM schedule_sessions WHERE id = $1 AND tenant_id = $2`;
    const getResult = await query(getSql, [id, tenantId]);
    
    if (getResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }
    
    const session = getResult.rows[0];
    const newRoomId = roomId || session.room_id;
    const newTeacherId = teacherId || session.teacher_id;
    const newClassId = classId || session.class_id;
    const newSessionDate = sessionDate || session.session_date;
    const newStartTime = startTime || session.start_time;
    const newEndTime = endTime || session.end_time;
    
    // 2. Conflict Detection (exclude current session id)
    const conflictSql = `
      SELECT * FROM check_schedule_conflict($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    const conflictParams = [
      tenantId, 
      newTeacherId, 
      newRoomId, 
      newClassId, 
      newSessionDate, 
      newStartTime, 
      newEndTime,
      id // p_exclude_id
    ];
    
    const conflictResult = await query(conflictSql, conflictParams);

    if (conflictResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'SCHEDULE_CONFLICT',
        conflicts: conflictResult.rows
      });
      return;
    }

    // 3. Update session
    const updateSql = `
      UPDATE schedule_sessions 
      SET session_date = $1, start_time = $2, end_time = $3, room_id = $4, teacher_id = $5, class_id = $6, session_type = $7, notes = $8
      WHERE id = $9 AND tenant_id = $10
      RETURNING *, session_date::text as session_date
    `;
    const updateParams = [newSessionDate, newStartTime, newEndTime, newRoomId, newTeacherId, newClassId, sessionType || session.session_type, notes !== undefined ? notes : session.notes, id, tenantId];

    const updatedSession = await query(updateSql, updateParams);

    res.status(200).json({
      success: true,
      data: updatedSession.rows[0]
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    const result = await query(
      `UPDATE schedule_sessions SET status = 'cancelled' WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};


import pool from '../db';
import { ValidationError, NotFoundError } from '../utils/errors';
import { syncEventToGoogle, deleteEventFromGoogle } from './google.service';

export interface GetScheduleParams {
  startDate: string;
  endDate: string;
  branchId?: string;
  teacherId?: string;
  classId?: string;
}

export interface CreateSessionDTO {
  classId: string;
  roomId: string;
  teacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  sessionType?: string;
  notes?: string;
}

export interface UpdateSessionDTO {
  classId?: string;
  roomId?: string;
  teacherId?: string;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  sessionType?: string;
  notes?: string;
}

export class ScheduleService {
  static async getWeeklySchedule(
    tenantId: string,
    params: GetScheduleParams,
    userRole?: string,
    userEmail?: string
  ) {
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
    const sqlParams: any[] = [tenantId, params.startDate, params.endDate];

    if (userRole === 'teacher' && userEmail) {
      const teacherRes = await pool.query(
        'SELECT id FROM teachers WHERE email = $1 AND tenant_id = $2',
        [userEmail, tenantId]
      );
      if (teacherRes.rows.length > 0) {
        sqlParams.push(teacherRes.rows[0].id);
        sql += ` AND s.teacher_id = $${sqlParams.length}`;
        if (params.classId) {
          sqlParams.push(params.classId);
          sql += ` AND s.class_id = $${sqlParams.length}`;
        }
        if (params.branchId) {
          sqlParams.push(params.branchId);
          sql += ` AND r.branch_id = $${sqlParams.length}`;
        }
      } else {
        return [];
      }
    } else if (userRole === 'student' && userEmail) {
      const studentRes = await pool.query(
        'SELECT id FROM students WHERE email = $1 AND tenant_id = $2',
        [userEmail, tenantId]
      );
      if (studentRes.rows.length > 0) {
        sqlParams.push(studentRes.rows[0].id);
        sql += ` AND s.class_id IN (SELECT class_id FROM class_students WHERE student_id = $${sqlParams.length})`;
        if (params.classId) {
          sqlParams.push(params.classId);
          sql += ` AND s.class_id = $${sqlParams.length}`;
        }
      } else {
        return [];
      }
    } else {
      if (params.teacherId) {
        sqlParams.push(params.teacherId);
        sql += ` AND s.teacher_id = $${sqlParams.length}`;
      }
      if (params.branchId) {
        sqlParams.push(params.branchId);
        sql += ` AND r.branch_id = $${sqlParams.length}`;
      }
      if (params.classId) {
        sqlParams.push(params.classId);
        sql += ` AND s.class_id = $${sqlParams.length}`;
      }
    }

    sql += ` ORDER BY s.session_date, s.start_time`;

    const result = await pool.query(sql, sqlParams);
    return result.rows;
  }

  static async createSession(tenantId: string, userId: string | undefined, data: CreateSessionDTO) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      const conflictSql = `SELECT * FROM check_schedule_conflict($1, $2, $3, $4, $5, $6, $7)`;
      const conflictParams = [
        tenantId,
        data.teacherId,
        data.roomId,
        data.classId,
        data.sessionDate,
        data.startTime,
        data.endTime,
      ];

      const conflictResult = await client.query(conflictSql, conflictParams);

      if (conflictResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, conflicts: conflictResult.rows };
      }

      const insertSql = `
        INSERT INTO schedule_sessions 
          (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time, session_type, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *, session_date::text as session_date
      `;
      const insertParams = [
        tenantId,
        data.classId,
        data.roomId,
        data.teacherId,
        data.sessionDate,
        data.startTime,
        data.endTime,
        data.sessionType || 'lecture',
        data.notes || '',
      ];

      const newSession = await client.query(insertSql, insertParams);
      const sessionData = newSession.rows[0];

      await client.query('COMMIT');

      if (userId) {
        const classRes = await pool.query('SELECT name FROM classes WHERE id = $1', [data.classId]);
        const roomRes = await pool.query('SELECT name FROM rooms WHERE id = $1', [data.roomId]);
        const teacherRes = await pool.query('SELECT full_name FROM teachers WHERE id = $1', [
          data.teacherId,
        ]);

        await syncEventToGoogle(userId, {
          id: sessionData.id,
          className: classRes.rows[0]?.name || 'Class',
          roomName: roomRes.rows[0]?.name || 'Room',
          teacherName: teacherRes.rows[0]?.full_name,
          teacherId: data.teacherId,
          notes: sessionData.notes,
          date: sessionData.session_date,
          startTime: sessionData.start_time,
          endTime: sessionData.end_time,
        });
      }

      return { success: true, data: sessionData };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateSession(
    tenantId: string,
    userId: string | undefined,
    sessionId: string,
    data: UpdateSessionDTO
  ) {
    const getResult = await pool.query(
      `SELECT * FROM schedule_sessions WHERE id = $1 AND tenant_id = $2`,
      [sessionId, tenantId]
    );

    if (getResult.rows.length === 0) {
      throw new NotFoundError('Session not found', 'NOT_FOUND');
    }

    const session = getResult.rows[0];
    const newRoomId = data.roomId || session.room_id;
    const newTeacherId = data.teacherId || session.teacher_id;
    const newClassId = data.classId || session.class_id;
    const newSessionDate = data.sessionDate || session.session_date;
    const newStartTime = data.startTime || session.start_time;
    const newEndTime = data.endTime || session.end_time;

    const conflictSql = `SELECT * FROM check_schedule_conflict($1, $2, $3, $4, $5, $6, $7, $8)`;
    const conflictParams = [
      tenantId,
      newTeacherId,
      newRoomId,
      newClassId,
      newSessionDate,
      newStartTime,
      newEndTime,
      sessionId,
    ];

    const conflictResult = await pool.query(conflictSql, conflictParams);

    if (conflictResult.rows.length > 0) {
      return { success: false, conflicts: conflictResult.rows };
    }

    const updateSql = `
      UPDATE schedule_sessions 
      SET session_date = $1, start_time = $2, end_time = $3, room_id = $4, teacher_id = $5, class_id = $6, session_type = $7, notes = $8
      WHERE id = $9 AND tenant_id = $10
      RETURNING *, session_date::text as session_date
    `;
    const updateParams = [
      newSessionDate,
      newStartTime,
      newEndTime,
      newRoomId,
      newTeacherId,
      newClassId,
      data.sessionType || session.session_type,
      data.notes !== undefined ? data.notes : session.notes,
      sessionId,
      tenantId,
    ];

    const updatedSession = await pool.query(updateSql, updateParams);
    const sessionData = updatedSession.rows[0];

    if (userId) {
      const classRes = await pool.query('SELECT name FROM classes WHERE id = $1', [newClassId]);
      const roomRes = await pool.query('SELECT name FROM rooms WHERE id = $1', [newRoomId]);
      const teacherRes = await pool.query('SELECT full_name FROM teachers WHERE id = $1', [
        newTeacherId,
      ]);

      await syncEventToGoogle(userId, {
        id: sessionData.id,
        className: classRes.rows[0]?.name || 'Class',
        roomName: roomRes.rows[0]?.name || 'Room',
        teacherName: teacherRes.rows[0]?.full_name,
        teacherId: newTeacherId,
        notes: sessionData.notes,
        date: sessionData.session_date,
        startTime: sessionData.start_time,
        endTime: sessionData.end_time,
      });
    }

    return { success: true, data: sessionData };
  }

  static async deleteSession(tenantId: string, userId: string | undefined, sessionId: string) {
    const result = await pool.query(
      `UPDATE schedule_sessions SET status = 'cancelled' WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [sessionId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Session not found', 'NOT_FOUND');
    }

    if (userId) {
      await deleteEventFromGoogle(userId, sessionId);
    }

    return true;
  }
}

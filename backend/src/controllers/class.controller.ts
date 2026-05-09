import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { checkPlanLimit } from '../utils/limitChecker';
import { NotFoundError, ValidationError } from '../utils/errors';
import { FeatureFlagService } from '../services/feature-flag.service';

export const getClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    let query = `
      SELECT c.*, b.name as branch_name, t.full_name as teacher_name 
      FROM classes c
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.tenant_id = $1 AND c.is_deleted = false
    `;
    const params: any[] = [tenantId];

    // If teacher, only show their classes
    if (userRole === 'teacher') {
      // Find teacher_id by email
      const teacherRes = await pool.query('SELECT id FROM teachers WHERE email = $1 AND tenant_id = $2', [userEmail, tenantId]);
      if (teacherRes.rows.length > 0) {
        query += ` AND c.teacher_id = $2`;
        params.push(teacherRes.rows[0].id);
      } else {
        // Teacher record not found, return empty
        return res.json([]);
      }
    }

    query += ` ORDER BY c.created_at DESC`;
    
    const result = await pool.query(query, params);

    const limit = await FeatureFlagService.checkLimit(tenantId as string, 'max_classes');
    if (limit > 0) {
      return res.json(result.rows.slice(0, limit));
    }

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.*, b.name as branch_name, t.full_name as teacher_name 
       FROM classes c
       LEFT JOIN branches b ON c.branch_id = b.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE c.id = $1 AND c.tenant_id = $2 AND c.is_deleted = false`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy lớp học', 'CLASS_NOT_FOUND');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const tenantId = req.tenantId || req.user?.tenantId;
    const { branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date } = req.body;

    if (!branch_id || !name) {
      throw new ValidationError('Vui lòng điền tên lớp và chi nhánh', 'MISSING_REQUIRED_FIELDS');
    }

    // Check Plan Limit
    await checkPlanLimit(tenantId as string, 'max_classes', 'classes', 'LIMIT_EXCEEDED');

    let actualSubjectId = subject_id;
    if (!actualSubjectId) {
      const subjectRes = await client.query(`SELECT id FROM subjects WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
      if (subjectRes.rows.length > 0) {
        actualSubjectId = subjectRes.rows[0].id;
      } else {
        const newSub = await client.query(`INSERT INTO subjects (tenant_id, name, code) VALUES ($1, 'General', 'GEN') RETURNING id`, [tenantId]);
        actualSubjectId = newSub.rows[0].id;
      }
    }

    const insertSql = `
      INSERT INTO classes 
        (tenant_id, branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const insertParams = [tenantId, branch_id, actualSubjectId, teacher_id || null, name, max_capacity || 30, start_date || new Date().toISOString().split('T')[0], end_date || new Date().toISOString().split('T')[0]];

    const newClass = await client.query(insertSql, insertParams);
    const classId = newClass.rows[0].id;

    // Handle Recurring Schedules
    const { recurring_schedules } = req.body; // Array of { day_of_week, start_time, end_time, room_id, notes }
    if (recurring_schedules && Array.isArray(recurring_schedules) && recurring_schedules.length > 0) {
      for (const schedule of recurring_schedules) {
        await client.query(
          `INSERT INTO class_recurring_schedules (class_id, day_of_week, start_time, end_time, room_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [classId, schedule.day_of_week, schedule.start_time, schedule.end_time, schedule.room_id || null, schedule.notes || null]
        );
      }

      // AUTO GENERATE SESSIONS
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      const sessions = [];

      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
        const matchingSchedules = recurring_schedules.filter(s => parseInt(s.day_of_week) === dayOfWeek);

        for (const s of matchingSchedules) {
          sessions.push({
            tenant_id: tenantId,
            class_id: classId,
            room_id: s.room_id || null,
            teacher_id: teacher_id || null,
            session_date: d.toISOString().split('T')[0],
            start_time: s.start_time,
            end_time: s.end_time,
            status: 'scheduled',
            notes: s.notes || null
          });
        }
      }

      // Batch insert sessions with conflict check
      let skippedCount = 0;
      let successCount = 0;

      for (const session of sessions) {
        // Even if teacher_id is null, we check for room/class conflicts. 
        // But the user specifically mentioned teacher conflicts.
        const conflictRes = await client.query(
          `SELECT * FROM check_schedule_conflict($1, $2, $3, $4, $5, $6, $7)`,
          [session.tenant_id, session.teacher_id, session.room_id, session.class_id, session.session_date, session.start_time, session.end_time]
        );

        if (conflictRes.rows.length === 0) {
          await client.query(
            `INSERT INTO schedule_sessions (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [session.tenant_id, session.class_id, session.room_id, session.teacher_id, session.session_date, session.start_time, session.end_time, session.status, session.notes || null]
          );
          successCount++;
        } else {
          skippedCount++;
        }
      }
      console.log(`Auto-generated sessions: ${successCount} success, ${skippedCount} skipped due to conflicts.`);
    }

    await client.query('COMMIT');
    res.status(201).json(newClass.rows[0]);
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('CREATE CLASS ERROR:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  } finally {
    if (client) client.release();
  }
};

export const getRecurringSchedules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM class_recurring_schedules WHERE class_id = $1 ORDER BY day_of_week, start_time`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date, status, recurring_schedules } = req.body;

    const result = await client.query(
      `UPDATE classes 
       SET branch_id = COALESCE($1, branch_id),
           subject_id = COALESCE($2, subject_id),
           teacher_id = $3,
           name = COALESCE($4, name),
           max_capacity = COALESCE($5, max_capacity),
           start_date = COALESCE($6, start_date),
           end_date = COALESCE($7, end_date),
           status = COALESCE($8, status)
       WHERE id = $9 AND tenant_id = $10
       RETURNING *`,
      [branch_id, subject_id || null, teacher_id || null, name, max_capacity, start_date || null, end_date || null, status, id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy lớp học', 'CLASS_NOT_FOUND');
    }

    // Update Recurring Schedules if provided
    if (recurring_schedules && Array.isArray(recurring_schedules)) {
      try {
        // 1. Delete old rules
        await client.query(`DELETE FROM class_recurring_schedules WHERE class_id = $1`, [id]);
        
        // 2. Insert new rules
        for (const schedule of recurring_schedules) {
          await client.query(
            `INSERT INTO class_recurring_schedules (class_id, day_of_week, start_time, end_time, room_id, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, schedule.day_of_week, schedule.start_time, schedule.end_time, schedule.room_id || null, schedule.notes || null]
          );
        }

        // 3. SYNC SESSIONS (Regenerate future sessions)
        const today = new Date().toISOString().split('T')[0];
        const classStart = start_date || result.rows[0].start_date;
        const classEnd = end_date || result.rows[0].end_date;
        
        if (classEnd) {
          // We only regenerate from MAX(today, classStart)
          const syncFrom = new Date(today) > new Date(classStart) ? today : classStart;
          const startDateObj = new Date(syncFrom);
          const endDateObj = new Date(classEnd);
          
          await client.query(
            `DELETE FROM schedule_sessions 
             WHERE class_id = $1 
               AND session_date >= $2 
               AND status = 'scheduled'
               AND id NOT IN (SELECT session_id FROM attendance)`,
            [id, syncFrom]
          );

          for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            const matchingSchedules = recurring_schedules.filter(s => parseInt(s.day_of_week) === dayOfWeek);

            for (const s of matchingSchedules) {
              const finalTeacherId = teacher_id || result.rows[0].teacher_id;
              const finalRoomId = s.room_id || null;
              const sessionDate = d.toISOString().split('T')[0];

              const conflictRes = await client.query(
                `SELECT * FROM check_schedule_conflict($1, $2, $3, $4, $5, $6, $7)`,
                [tenantId, finalTeacherId, finalRoomId, id, sessionDate, s.start_time, s.end_time]
              );

              if (conflictRes.rows.length === 0) {
                await client.query(
                  `INSERT INTO schedule_sessions (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time, status, notes)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                  [tenantId, id, finalRoomId, finalTeacherId, sessionDate, s.start_time, s.end_time, 'scheduled', s.notes || null]
                );
              }
            }
          }
        }
      } catch (syncError: any) {
        console.error('SYNC SESSIONS ERROR:', syncError);
        throw syncError; 
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('UPDATE CLASS ERROR:', error);
    res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: error.message,
      detail: error.detail || error.hint || null
    });
  } finally {
    if (client) client.release();
  }
};

export const deleteClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE classes SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy lớp học', 'CLASS_NOT_FOUND');
    }

    res.json({ success: true, message: 'Lớp học đã được xóa thành công' });
  } catch (error) {
    next(error);
  }
};

export const getEnrollments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT s.*, cs.enrolled_at, cs.status as enrollment_status
       FROM students s
       JOIN class_students cs ON s.id = cs.student_id
       WHERE cs.class_id = $1 AND s.tenant_id = $2 AND s.is_deleted = false
       ORDER BY s.full_name`,
      [id, tenantId]
    );
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const enrollStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { student_id, student_ids } = req.body;

    // 1. Get class capacity
    const classRes = await pool.query(
      `SELECT max_capacity FROM classes WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    
    if (classRes.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy lớp học', 'CLASS_NOT_FOUND');
    }
    
    const maxCapacity = classRes.rows[0].max_capacity;

    // 2. Get current student count
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM class_students WHERE class_id = $1`,
      [id]
    );
    const currentCount = parseInt(countRes.rows[0].count);

    // 3. Handle single or bulk enrollment
    const idsToAdd = student_ids || (student_id ? [student_id] : []);
    
    if (idsToAdd.length === 0) {
      throw new ValidationError('Vui lòng chọn ít nhất một học sinh', 'MISSING_REQUIRED_FIELDS');
    }

    if (currentCount + idsToAdd.length > maxCapacity) {
      throw new ValidationError(`Lớp đã đạt giới hạn sức chứa (${maxCapacity} học sinh). Chỉ còn trống ${maxCapacity - currentCount} chỗ.`, 'CAPACITY_EXCEEDED');
    }

    const results = [];
    for (const sid of idsToAdd) {
      const res = await pool.query(
        `INSERT INTO class_students (tenant_id, class_id, student_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (class_id, student_id) DO NOTHING
         RETURNING *`,
        [tenantId, id, sid]
      );
      if (res.rows[0]) results.push(res.rows[0]);
    }

    res.status(201).json({ success: true, count: results.length });
  } catch (error) {
    next(error);
  }
};


export const unenrollStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id, studentId } = req.params;

    await pool.query(
      `DELETE FROM class_students 
       WHERE class_id = $1 AND student_id = $2 AND tenant_id = $3`,
      [id, studentId, tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};


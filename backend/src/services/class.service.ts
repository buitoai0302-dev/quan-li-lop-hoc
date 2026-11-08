import { ERROR_CODES } from '../utils/constants';
import type { PoolClient } from 'pg';
import pool from '../db';
import { checkPlanLimit } from '../utils/limitChecker';
import {
  NotFoundError,
  ScheduleConflictError,
  ValidationError,
  scheduleWriteError,
} from '../utils/errors';
import { FeatureFlagService } from './feature-flag.service';
import { CreateClassDto, UpdateClassDto } from '../types';
import { assertTenantReferences } from './tenant-reference.service';
import { lockScheduleWrites } from './schedule-write.service';

async function insertRecurringSession(
  client: PoolClient,
  tenantId: string,
  classId: string,
  teacherId: string,
  date: string,
  schedule: NonNullable<CreateClassDto['recurring_schedules']>[number],
  keepAttendedSession = false
) {
  const { room_id: roomId, start_time: startTime, end_time: endTime, notes } = schedule;
  const slot = { date, startTime, endTime };
  const params = [tenantId, teacherId, roomId, classId, date, startTime, endTime];

  if (keepAttendedSession) {
    const existing = await client.query(
      `SELECT 1 FROM schedule_sessions s
       WHERE s.tenant_id = $1 AND s.teacher_id = $2 AND s.room_id = $3
         AND s.class_id = $4 AND s.session_date = $5 AND s.start_time = $6 AND s.end_time = $7
         AND s.status <> 'cancelled'
         AND EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = s.id AND a.tenant_id = s.tenant_id)`,
      params
    );
    if (existing.rows.length > 0) return;
  }

  const conflicts = await client.query(
    'SELECT * FROM check_schedule_conflict($1, $2, $3, $4, $5, $6, $7)',
    params
  );
  if (conflicts.rows.length > 0) {
    throw new ScheduleConflictError(conflicts.rows, slot);
  }

  try {
    await client.query(
      `INSERT INTO schedule_sessions (tenant_id, teacher_id, room_id, class_id, session_date, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [...params, notes || null]
    );
  } catch (error) {
    throw scheduleWriteError(error, slot);
  }
}

export class ClassService {
  private static async assertTeacherClassAccess(
    tenantId: string,
    classId: string,
    role?: string,
    email?: string
  ) {
    if (role !== 'teacher') return;
    const access = await pool.query(
      `SELECT 1 FROM classes c JOIN teachers t ON t.id = c.teacher_id
       WHERE c.id = $1 AND c.tenant_id = $2 AND t.tenant_id = $2 AND t.email = $3`,
      [classId, tenantId, email]
    );
    if (access.rows.length === 0)
      throw new NotFoundError('CLASS_NOT_FOUND', ERROR_CODES.CLASS_NOT_FOUND);
  }

  static async getClasses(
    tenantId: string,
    userRole: string | undefined,
    userEmail: string | undefined
  ) {
    let query = `
      SELECT c.*, b.name as branch_name, t.full_name as teacher_name 
      FROM classes c
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.tenant_id = $1 AND c.is_deleted = false
    `;
    const params: any[] = [tenantId];

    if (userRole === 'teacher') {
      const teacherRes = await pool.query(
        'SELECT id FROM teachers WHERE email = $1 AND tenant_id = $2',
        [userEmail, tenantId]
      );
      if (teacherRes.rows.length > 0) {
        query += ` AND c.teacher_id = $2`;
        params.push(teacherRes.rows[0].id);
      } else {
        return [];
      }
    } else if (userRole === 'student') {
      query += ` AND EXISTS (
        SELECT 1 FROM class_students cs
        JOIN students s ON s.id = cs.student_id
        WHERE cs.class_id = c.id AND s.tenant_id = $1 AND s.email = $2
          AND s.is_deleted = false AND cs.status = 'enrolled'
      )`;
      params.push(userEmail);
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);

    const limit = await FeatureFlagService.checkLimit(tenantId as string, 'max_classes');
    if (limit > 0) {
      return result.rows.slice(0, limit);
    }

    return result.rows;
  }

  static async getClassById(tenantId: string, id: string, userRole?: string, userEmail?: string) {
    const result = await pool.query(
      `SELECT c.*, b.name as branch_name, t.full_name as teacher_name 
       FROM classes c
       LEFT JOIN branches b ON c.branch_id = b.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE c.id = $1 AND c.tenant_id = $2 AND c.is_deleted = false`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('CLASS_NOT_FOUND', ERROR_CODES.CLASS_NOT_FOUND);
    }
    await this.assertTeacherClassAccess(tenantId, id, userRole, userEmail);

    if (userRole === 'student') {
      const enrolled = await pool.query(
        `SELECT 1 FROM class_students cs
         JOIN students s ON s.id = cs.student_id
         WHERE cs.class_id = $1 AND s.tenant_id = $2 AND s.email = $3
           AND s.is_deleted = false AND cs.status = 'enrolled'`,
        [id, tenantId, userEmail]
      );
      if (enrolled.rows.length === 0)
        throw new NotFoundError('CLASS_NOT_FOUND', ERROR_CODES.CLASS_NOT_FOUND);
    }

    return result.rows[0];
  }

  static async createClass(tenantId: string, data: CreateClassDto) {
    let client;
    try {
      const {
        branch_id,
        subject_id,
        teacher_id,
        name,
        max_capacity,
        start_date,
        end_date,
        recurring_schedules,
        enrollments,
      } = data;

      if (!branch_id || !name) {
        throw new ValidationError('MISSING_REQUIRED_FIELDS', ERROR_CODES.MISSING_REQUIRED_FIELDS);
      }
      if (
        recurring_schedules?.length &&
        (!teacher_id || recurring_schedules.some((schedule) => !schedule.room_id))
      ) {
        throw new ValidationError(
          'Lịch lặp cần giáo viên và phòng học cho mỗi buổi',
          ERROR_CODES.SCHEDULE_REQUIRES_TEACHER_AND_ROOM
        );
      }
      await checkPlanLimit(tenantId, 'max_classes', 'classes', 'LIMIT_EXCEEDED');
      client = await pool.connect();
      await client.query('BEGIN');
      if (recurring_schedules?.length) await lockScheduleWrites(client, tenantId);

      await assertTenantReferences(client, tenantId, 'branches', [branch_id]);
      await assertTenantReferences(client, tenantId, 'subjects', [subject_id]);
      await assertTenantReferences(client, tenantId, 'teachers', [teacher_id]);
      await assertTenantReferences(
        client,
        tenantId,
        'rooms',
        recurring_schedules?.map((schedule) => schedule.room_id) || []
      );
      await assertTenantReferences(client, tenantId, 'students', enrollments || []);

      let actualSubjectId = subject_id;
      if (!actualSubjectId) {
        const subjectRes = await client.query(
          `SELECT id FROM subjects WHERE tenant_id = $1 LIMIT 1`,
          [tenantId]
        );
        if (subjectRes.rows.length > 0) {
          actualSubjectId = subjectRes.rows[0].id;
        } else {
          const newSub = await client.query(
            `INSERT INTO subjects (tenant_id, name, code) VALUES ($1, 'General', 'GEN') RETURNING id`,
            [tenantId]
          );
          actualSubjectId = newSub.rows[0].id;
        }
      }

      const insertSql = `
        INSERT INTO classes 
          (tenant_id, branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const insertParams = [
        tenantId,
        branch_id,
        actualSubjectId,
        teacher_id || null,
        name,
        max_capacity || 30,
        start_date || new Date().toISOString().split('T')[0],
        end_date || new Date().toISOString().split('T')[0],
      ];

      const newClass = await client.query(insertSql, insertParams);
      const classId = newClass.rows[0].id;

      if (
        recurring_schedules &&
        Array.isArray(recurring_schedules) &&
        recurring_schedules.length > 0
      ) {
        for (const schedule of recurring_schedules) {
          await client.query(
            `INSERT INTO class_recurring_schedules (class_id, day_of_week, start_time, end_time, room_id, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              classId,
              schedule.day_of_week,
              schedule.start_time,
              schedule.end_time,
              schedule.room_id || null,
              schedule.notes || null,
            ]
          );
        }

        const startDateObj = new Date(start_date || new Date().toISOString().split('T')[0]);
        const endDateObj = new Date(end_date || new Date().toISOString().split('T')[0]);
        for (let d = new Date(startDateObj); d <= endDateObj; d.setUTCDate(d.getUTCDate() + 1)) {
          const dayOfWeek = d.getUTCDay();
          const matchingSchedules = recurring_schedules.filter(
            (s) => parseInt(s.day_of_week) === dayOfWeek
          );

          for (const s of matchingSchedules) {
            await insertRecurringSession(
              client,
              tenantId,
              classId,
              newClass.rows[0].teacher_id,
              d.toISOString().slice(0, 10),
              s
            );
          }
        }
      }

      if (enrollments && Array.isArray(enrollments) && enrollments.length > 0) {
        for (const sid of enrollments) {
          await client.query(
            `INSERT INTO class_students (tenant_id, class_id, student_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (class_id, student_id) DO NOTHING`,
            [tenantId, classId, sid]
          );
        }
      }

      await client.query('COMMIT');
      return newClass.rows[0];
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  static async getRecurringSchedules(
    tenantId: string,
    id: string,
    userRole?: string,
    userEmail?: string
  ) {
    await this.assertTeacherClassAccess(tenantId, id, userRole, userEmail);
    const result = await pool.query(
      `SELECT crs.* FROM class_recurring_schedules crs
       JOIN classes c ON c.id = crs.class_id
       WHERE crs.class_id = $1 AND c.tenant_id = $2 AND c.is_deleted = false
       ORDER BY crs.day_of_week, crs.start_time`,
      [id, tenantId]
    );
    return result.rows;
  }

  static async updateClass(tenantId: string, id: string, data: UpdateClassDto) {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const {
        branch_id,
        subject_id,
        teacher_id,
        name,
        max_capacity,
        start_date,
        end_date,
        status,
        recurring_schedules,
        enrollments,
      } = data;

      if (Array.isArray(recurring_schedules)) await lockScheduleWrites(client, tenantId);
      await assertTenantReferences(client, tenantId, 'branches', [branch_id]);
      await assertTenantReferences(client, tenantId, 'subjects', [subject_id]);
      await assertTenantReferences(client, tenantId, 'teachers', [teacher_id]);
      await assertTenantReferences(
        client,
        tenantId,
        'rooms',
        recurring_schedules?.map((schedule) => schedule.room_id) || []
      );
      await assertTenantReferences(client, tenantId, 'students', enrollments || []);

      const result = await client.query(
        `UPDATE classes 
         SET branch_id = COALESCE($1, branch_id),
             subject_id = COALESCE($2, subject_id),
             teacher_id = CASE WHEN $11::boolean THEN $3 ELSE teacher_id END,
             name = COALESCE($4, name),
             max_capacity = COALESCE($5, max_capacity),
             start_date = COALESCE($6, start_date),
             end_date = COALESCE($7, end_date),
             status = COALESCE($8, status)
         WHERE id = $9 AND tenant_id = $10
         RETURNING *, start_date::text AS schedule_start_date, end_date::text AS schedule_end_date`,
        [
          branch_id,
          subject_id || null,
          teacher_id || null,
          name,
          max_capacity,
          start_date || null,
          end_date || null,
          status,
          id,
          tenantId,
          Object.prototype.hasOwnProperty.call(data, 'teacher_id'),
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('CLASS_NOT_FOUND', ERROR_CODES.CLASS_NOT_FOUND);
      }
      const {
        schedule_start_date: classStart,
        schedule_end_date: classEnd,
        ...updatedClass
      } = result.rows[0];
      if (
        recurring_schedules?.length &&
        (!result.rows[0].teacher_id || recurring_schedules.some((schedule) => !schedule.room_id))
      ) {
        throw new ValidationError(
          'Lịch lặp cần giáo viên và phòng học cho mỗi buổi',
          ERROR_CODES.SCHEDULE_REQUIRES_TEACHER_AND_ROOM
        );
      }

      if (recurring_schedules && Array.isArray(recurring_schedules)) {
        const today = new Date().toISOString().slice(0, 10);
        const syncFrom = today > classStart ? today : classStart;
        await client.query(
          `DELETE FROM schedule_sessions s
           WHERE s.class_id = $1 AND s.tenant_id = $3
             AND s.session_date >= $2 AND s.status = 'scheduled'
             AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = s.id)
             AND EXISTS (
               SELECT 1 FROM class_recurring_schedules r
               WHERE r.class_id = s.class_id AND r.room_id = s.room_id
                 AND r.day_of_week = EXTRACT(DOW FROM s.session_date)
                 AND r.start_time = s.start_time AND r.end_time = s.end_time
             )`,
          [id, today, tenantId]
        );
        await client.query(`DELETE FROM class_recurring_schedules WHERE class_id = $1`, [id]);

        for (const schedule of recurring_schedules) {
          await client.query(
            `INSERT INTO class_recurring_schedules (class_id, day_of_week, start_time, end_time, room_id, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              schedule.day_of_week,
              schedule.start_time,
              schedule.end_time,
              schedule.room_id || null,
              schedule.notes || null,
            ]
          );
        }

        if (classEnd) {
          const startDateObj = new Date(syncFrom);
          const endDateObj = new Date(classEnd);

          for (let d = new Date(startDateObj); d <= endDateObj; d.setUTCDate(d.getUTCDate() + 1)) {
            const dayOfWeek = d.getUTCDay();
            const matchingSchedules = recurring_schedules.filter(
              (s) => parseInt(s.day_of_week) === dayOfWeek
            );

            for (const s of matchingSchedules) {
              await insertRecurringSession(
                client,
                tenantId,
                id,
                updatedClass.teacher_id,
                d.toISOString().slice(0, 10),
                s,
                true
              );
            }
          }
        }
      }

      if (enrollments && Array.isArray(enrollments)) {
        const existingRes = await client.query(
          `SELECT student_id FROM class_students WHERE class_id = $1`,
          [id]
        );
        const existingIds = existingRes.rows.map((r: any) => r.student_id);

        for (const sid of enrollments) {
          if (!existingIds.includes(sid)) {
            await client.query(
              `INSERT INTO class_students (tenant_id, class_id, student_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (class_id, student_id) DO NOTHING`,
              [tenantId, id, sid]
            );
          }
        }

        for (const exId of existingIds) {
          if (!enrollments.includes(exId)) {
            await client.query(
              `DELETE FROM class_students WHERE class_id = $1 AND student_id = $2`,
              [id, exId]
            );
          }
        }
      }

      await client.query('COMMIT');
      return updatedClass;
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  static async deleteClass(tenantId: string, id: string) {
    const result = await pool.query(
      `UPDATE classes SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('CLASS_NOT_FOUND', ERROR_CODES.CLASS_NOT_FOUND);
    }

    return true;
  }

  static async getEnrollments(tenantId: string, id: string, userRole?: string, userEmail?: string) {
    await this.assertTeacherClassAccess(tenantId, id, userRole, userEmail);
    const result = await pool.query(
      `SELECT s.*, cs.enrolled_at, cs.status as enrollment_status
       FROM students s
       JOIN class_students cs ON s.id = cs.student_id
       JOIN classes c ON c.id = cs.class_id
       WHERE cs.class_id = $1 AND c.tenant_id = $2 AND s.tenant_id = $2
         AND s.is_deleted = false
       ORDER BY s.full_name`,
      [id, tenantId]
    );
    return result.rows;
  }

  static async enrollStudent(
    tenantId: string,
    id: string,
    student_id: string | null,
    student_ids: string[] | null
  ) {
    const classRes = await pool.query(
      `SELECT max_capacity FROM classes WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (classRes.rows.length === 0) {
      throw new NotFoundError('CLASS_NOT_FOUND', ERROR_CODES.CLASS_NOT_FOUND);
    }

    const maxCapacity = classRes.rows[0].max_capacity;

    const countRes = await pool.query(`SELECT COUNT(*) FROM class_students WHERE class_id = $1`, [
      id,
    ]);
    const currentCount = parseInt(countRes.rows[0].count);

    const idsToAdd = student_ids || (student_id ? [student_id] : []);

    if (idsToAdd.length === 0) {
      throw new ValidationError(
        'Vui lòng chọn ít nhất một học sinh',
        ERROR_CODES.MISSING_REQUIRED_FIELDS
      );
    }
    await assertTenantReferences(pool, tenantId, 'students', idsToAdd);

    if (currentCount + idsToAdd.length > maxCapacity) {
      throw new ValidationError('CAPACITY_EXCEEDED', ERROR_CODES.CAPACITY_EXCEEDED);
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

    return results;
  }

  static async unenrollStudent(tenantId: string, id: string, studentId: string) {
    await pool.query(
      `DELETE FROM class_students 
       WHERE class_id = $1 AND student_id = $2 AND tenant_id = $3`,
      [id, studentId, tenantId]
    );
    return true;
  }
}

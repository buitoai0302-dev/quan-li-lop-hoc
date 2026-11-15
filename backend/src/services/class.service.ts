import { ERROR_CODES, VIETNAM_TIME_ZONE } from '../utils/constants';
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
import { lockClassForEnrollment, updateClassEnrollments } from './class-enrollment.service';

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

      if (enrollments?.length) {
        await updateClassEnrollments(
          client,
          tenantId,
          classId,
          newClass.rows[0].max_capacity,
          enrollments,
          []
        );
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
        enrollment_changes: enrollmentChanges,
      } = data;

      if (Array.isArray(recurring_schedules)) await lockScheduleWrites(client, tenantId);
      const changesEnrollments = enrollments !== undefined || enrollmentChanges !== undefined;
      const previousCapacity =
        changesEnrollments || max_capacity !== undefined
          ? await lockClassForEnrollment(client, tenantId, id)
          : undefined;
      const addedIds = enrollmentChanges?.add ?? enrollments ?? [];
      const removedIds = enrollmentChanges?.remove ?? [];
      await assertTenantReferences(client, tenantId, 'branches', [branch_id]);
      await assertTenantReferences(client, tenantId, 'subjects', [subject_id]);
      await assertTenantReferences(client, tenantId, 'teachers', [teacher_id]);
      await assertTenantReferences(
        client,
        tenantId,
        'rooms',
        recurring_schedules?.map((schedule) => schedule.room_id) || []
      );
      await assertTenantReferences(client, tenantId, 'students', [...addedIds, ...removedIds]);

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
         WHERE id = $9 AND tenant_id = $10 AND is_deleted = false
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
        const {
          rows: [{ today }],
        } = await client.query<{ today: string }>(
          'SELECT ((CURRENT_TIMESTAMP AT TIME ZONE $1)::date)::text AS today',
          [VIETNAM_TIME_ZONE]
        );
        const syncFrom = today > classStart ? today : classStart;
        await client.query(
          `DELETE FROM schedule_sessions s
           WHERE s.class_id = $1 AND s.tenant_id = $3
             AND s.session_date >= $2 AND s.status = 'scheduled'
             AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = s.id AND a.tenant_id = s.tenant_id)
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

      if (
        changesEnrollments ||
        (previousCapacity !== undefined && updatedClass.max_capacity < previousCapacity)
      ) {
        await updateClassEnrollments(
          client,
          tenantId,
          id,
          updatedClass.max_capacity,
          addedIds,
          removedIds,
          { replace: enrollments !== undefined, previousCapacity }
        );
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
    const idsToAdd = student_ids || (student_id ? [student_id] : []);

    if (idsToAdd.length === 0) {
      throw new ValidationError(
        'Vui lòng chọn ít nhất một học sinh',
        ERROR_CODES.MISSING_REQUIRED_FIELDS
      );
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const maxCapacity = await lockClassForEnrollment(client, tenantId, id);
      await assertTenantReferences(client, tenantId, 'students', idsToAdd);
      const results = await updateClassEnrollments(client, tenantId, id, maxCapacity, idsToAdd, []);
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async unenrollStudent(tenantId: string, id: string, studentId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const target = await client.query(
        'SELECT id FROM classes WHERE tenant_id = $1 AND id = $2 FOR NO KEY UPDATE',
        [tenantId, id]
      );
      if (target.rows.length) {
        await client.query(
          'DELETE FROM class_students WHERE tenant_id = $1 AND class_id = $2 AND student_id = $3',
          [tenantId, id, studentId]
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

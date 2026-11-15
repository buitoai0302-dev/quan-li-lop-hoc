import { ERROR_CODES } from '../utils/constants';
import pool from '../db';
import { checkPlanLimit } from '../utils/limitChecker';
import { NotFoundError, ValidationError } from '../utils/errors';
import { FeatureFlagService } from './feature-flag.service';
import { CreateStudentDto, UpdateStudentDto } from '../types';
import { assertTenantReferences } from './tenant-reference.service';
import { lockClassForEnrollment, updateClassEnrollments } from './class-enrollment.service';
import { lockTenantImport } from './import-lock.service';
import { bulkStudentImportSchema } from '../validators/import.validator';

export class StudentService {
  static async getStudents(tenantId: string) {
    const result = await pool.query(
      `SELECT s.*, b.name as branch_name 
       FROM students s
       LEFT JOIN branches b ON s.branch_id = b.id
       WHERE s.tenant_id = $1 AND s.is_deleted = false
       ORDER BY s.created_at DESC`,
      [tenantId]
    );

    const limit = await FeatureFlagService.checkLimit(tenantId as string, 'max_students');
    if (limit > 0) {
      return result.rows.slice(0, limit);
    }

    return result.rows;
  }

  static async createStudent(tenantId: string, data: CreateStudentDto) {
    const { full_name, email, phone, date_of_birth, branch_id, parent_phone } = data;

    if (!full_name || !email || !branch_id) {
      throw new ValidationError('MISSING_REQUIRED_FIELDS', ERROR_CODES.MISSING_REQUIRED_FIELDS);
    }

    await checkPlanLimit(tenantId, 'max_students', 'students', 'LIMIT_EXCEEDED');
    await assertTenantReferences(pool, tenantId, 'branches', [branch_id]);

    try {
      const result = await pool.query(
        `INSERT INTO students (tenant_id, branch_id, full_name, email, phone, date_of_birth, parent_phone) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [tenantId, branch_id, full_name, email, phone, date_of_birth, parent_phone]
      );
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ValidationError('EMAIL_ALREADY_EXISTS', ERROR_CODES.EMAIL_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  static async updateStudent(tenantId: string, id: string, data: UpdateStudentDto) {
    const { full_name, phone, date_of_birth, branch_id, is_active, parent_phone } = data;
    await assertTenantReferences(pool, tenantId, 'branches', [branch_id]);

    const result = await pool.query(
      `UPDATE students 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           date_of_birth = COALESCE($3, date_of_birth),
           branch_id = COALESCE($4, branch_id),
           is_active = COALESCE($5, is_active),
           parent_phone = COALESCE($6, parent_phone)
       WHERE id = $7 AND tenant_id = $8 RETURNING *`,
      [full_name, phone, date_of_birth, branch_id, is_active, parent_phone, id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('STUDENT_NOT_FOUND', ERROR_CODES.STUDENT_NOT_FOUND);
    }

    return result.rows[0];
  }

  static async deleteStudent(tenantId: string, id: string) {
    const result = await pool.query(
      `UPDATE students SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('STUDENT_NOT_FOUND', ERROR_CODES.STUDENT_NOT_FOUND);
    }

    return true;
  }

  static async bulkImport(
    tenantId: string,
    data: { students: CreateStudentDto[]; branch_id: string }
  ) {
    const parsed = bulkStudentImportSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError('Invalid student import data', ERROR_CODES.INVALID_IMPORT_DATA);
    }
    const { students, branch_id } = parsed.data;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await assertTenantReferences(client, tenantId, 'branches', [branch_id]);
      await lockTenantImport(client, tenantId);

      const createdStudents = [];
      const createdClasses = new Map<string, string>();

      for (const s of students) {
        const { full_name, email, phone, class_name, date_of_birth, parent_phone } = s;

        if (!full_name || !email) continue;

        const studentRes = await client.query(
          `INSERT INTO students (tenant_id, branch_id, full_name, email, phone, date_of_birth, parent_phone)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (tenant_id, email) DO UPDATE SET full_name = EXCLUDED.full_name
           RETURNING id`,
          [tenantId, branch_id, full_name, email, phone, date_of_birth || null, parent_phone]
        );
        const studentId = studentRes.rows[0].id as string;
        createdStudents.push(studentId);

        if (class_name) {
          let classId = createdClasses.get(class_name);

          if (!classId) {
            const classRes = await client.query(
              `SELECT id FROM classes WHERE name = $1 AND tenant_id = $2 AND branch_id = $3 AND is_deleted = false
               ORDER BY created_at, id LIMIT 1 FOR NO KEY UPDATE`,
              [class_name, tenantId, branch_id]
            );

            if (classRes.rows.length > 0) {
              classId = classRes.rows[0].id;
            } else {
              const subjectRes = await client.query(
                `SELECT id FROM subjects WHERE tenant_id = $1 ORDER BY created_at, id LIMIT 1`,
                [tenantId]
              );

              let subjectId;
              if (subjectRes.rows.length > 0) {
                subjectId = subjectRes.rows[0].id;
              } else {
                const newSubjectRes = await client.query(
                  `INSERT INTO subjects (tenant_id, name, code)
                   VALUES ($1, 'Chung', 'CHUNG')
                   ON CONFLICT (tenant_id, code) DO UPDATE SET code = EXCLUDED.code
                   RETURNING id`,
                  [tenantId]
                );
                subjectId = newSubjectRes.rows[0].id;
              }

              const startDate = new Date();
              const endDate = new Date();
              endDate.setMonth(endDate.getMonth() + 6);

              const newClassRes = await client.query(
                `INSERT INTO classes (tenant_id, branch_id, subject_id, name, start_date, end_date, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'active')
                 RETURNING id`,
                [tenantId, branch_id, subjectId, class_name, startDate, endDate]
              );
              classId = newClassRes.rows[0].id;
            }
            if (class_name && classId) {
              createdClasses.set(class_name, classId);
            }
          }

          if (!classId) throw new NotFoundError('Class not found', ERROR_CODES.CLASS_NOT_FOUND);
          const maxCapacity = await lockClassForEnrollment(client, tenantId, classId);
          await updateClassEnrollments(client, tenantId, classId, maxCapacity, [studentId], []);
        }
      }

      await client.query('COMMIT');
      return {
        success: true,
        students_count: createdStudents.length,
        classes_count: createdClasses.size,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

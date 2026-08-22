import pool from '../db';
import { checkPlanLimit } from '../utils/limitChecker';
import { NotFoundError, ValidationError } from '../utils/errors';
import { FeatureFlagService } from './feature-flag.service';

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

  static async createStudent(tenantId: string, data: any) {
    const { full_name, email, phone, date_of_birth, branch_id, parent_phone } = data;

    if (!full_name || !email || !branch_id) {
      throw new ValidationError(
        'Vui lòng điền đầy đủ thông tin bắt buộc',
        'MISSING_REQUIRED_FIELDS'
      );
    }

    await checkPlanLimit(tenantId, 'max_students', 'students', 'LIMIT_EXCEEDED');

    try {
      const result = await pool.query(
        `INSERT INTO students (tenant_id, branch_id, full_name, email, phone, date_of_birth, parent_phone) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [tenantId, branch_id, full_name, email, phone, date_of_birth, parent_phone]
      );
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ValidationError('Email học sinh đã tồn tại', 'EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }
  }

  static async updateStudent(tenantId: string, id: string, data: any) {
    const { full_name, phone, date_of_birth, branch_id, is_active, parent_phone } = data;

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
      throw new NotFoundError('Không tìm thấy học sinh', 'STUDENT_NOT_FOUND');
    }

    return result.rows[0];
  }

  static async deleteStudent(tenantId: string, id: string) {
    const result = await pool.query(
      `UPDATE students SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy học sinh', 'STUDENT_NOT_FOUND');
    }

    return true;
  }

  static async bulkImport(tenantId: string, data: any) {
    let client;
    try {
      client = await pool.connect();
      const { students, branch_id } = data;

      if (!students || !Array.isArray(students) || students.length === 0) {
        throw new ValidationError('Danh sách học sinh không hợp lệ', 'INVALID_DATA');
      }

      if (!branch_id) {
        throw new ValidationError('Thiếu branch_id', 'MISSING_REQUIRED_FIELDS');
      }

      await client.query('BEGIN');

      const createdStudents = [];
      const createdClasses = new Map<string, string>();

      for (const s of students) {
        const { full_name, email, phone, class_name } = s;

        if (!full_name || !email) continue;

        let studentId;
        const studentRes = await client.query(
          `INSERT INTO students (tenant_id, branch_id, full_name, email, phone)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tenant_id, email) DO UPDATE SET full_name = EXCLUDED.full_name
           RETURNING id`,
          [tenantId, branch_id, full_name, email, phone]
        );
        studentId = studentRes.rows[0].id;
        createdStudents.push(studentId);

        if (class_name) {
          let classId = createdClasses.get(class_name);

          if (!classId) {
            const classRes = await client.query(
              `SELECT id FROM classes WHERE name = $1 AND tenant_id = $2 AND branch_id = $3 AND is_deleted = false`,
              [class_name, tenantId, branch_id]
            );

            if (classRes.rows.length > 0) {
              classId = classRes.rows[0].id;
            } else {
              let subjectRes = await client.query(
                `SELECT id FROM subjects WHERE tenant_id = $1 LIMIT 1`,
                [tenantId]
              );

              let subjectId;
              if (subjectRes.rows.length > 0) {
                subjectId = subjectRes.rows[0].id;
              } else {
                const newSubjectRes = await client.query(
                  `INSERT INTO subjects (tenant_id, name, code)
                   VALUES ($1, 'Chung', 'CHUNG')
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

          await client.query(
            `INSERT INTO class_students (tenant_id, class_id, student_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (class_id, student_id) DO NOTHING`,
            [tenantId, classId, studentId]
          );
        }
      }

      await client.query('COMMIT');
      return {
        success: true,
        students_count: createdStudents.length,
        classes_count: createdClasses.size,
      };
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }
}

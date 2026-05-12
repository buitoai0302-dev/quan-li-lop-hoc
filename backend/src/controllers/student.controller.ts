import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { checkPlanLimit } from '../utils/limitChecker';
import { NotFoundError, ValidationError } from '../utils/errors';
import { FeatureFlagService } from '../services/feature-flag.service';

export const getStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;

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
      return res.json(result.rows.slice(0, limit));
    }

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { full_name, email, phone, date_of_birth, branch_id, parent_phone } = req.body;

    if (!full_name || !email || !branch_id) {
      throw new ValidationError(
        'Vui lòng điền đầy đủ thông tin bắt buộc',
        'MISSING_REQUIRED_FIELDS'
      );
    }

    // Check Plan Limit
    await checkPlanLimit(tenantId as string, 'max_students', 'students', 'LIMIT_EXCEEDED');

    const result = await pool.query(
      `INSERT INTO students (tenant_id, branch_id, full_name, email, phone, date_of_birth, parent_phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tenantId, branch_id, full_name, email, phone, date_of_birth, parent_phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return next(new ValidationError('Email học sinh đã tồn tại', 'EMAIL_ALREADY_EXISTS'));
    }
    next(error);
  }
};

export const updateStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { full_name, phone, date_of_birth, branch_id, is_active, parent_phone } = req.body;

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

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE students SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy học sinh', 'STUDENT_NOT_FOUND');
    }

    res.json({ success: true, message: 'Học sinh đã được xóa thành công' });
  } catch (error) {
    next(error);
  }
};

export const bulkImport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { students, branch_id } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      throw new ValidationError('Danh sách học sinh không hợp lệ', 'INVALID_DATA');
    }

    if (!branch_id) {
      throw new ValidationError('Thiếu branch_id', 'MISSING_REQUIRED_FIELDS');
    }

    await client.query('BEGIN');

    const createdStudents = [];
    const createdClasses = new Map<string, string>(); // name -> id

    for (const s of students) {
      const { full_name, email, phone, class_name } = s;

      if (!full_name || !email) continue;

      // 1. Create Student (if not exists by email, or skip/update)
      // For simplicity, we'll try to insert and skip if email exists or return existing
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

      // 2. Handle Class
      if (class_name) {
        let classId = createdClasses.get(class_name);

        if (!classId) {
          // Check if class exists in DB
          const classRes = await client.query(
            `SELECT id FROM classes WHERE name = $1 AND tenant_id = $2 AND branch_id = $3 AND is_deleted = false`,
            [class_name, tenantId, branch_id]
          );

          if (classRes.rows.length > 0) {
            classId = classRes.rows[0].id;
          } else {
            // Get a default subject for the class
            let subjectRes = await client.query(
              `SELECT id FROM subjects WHERE tenant_id = $1 LIMIT 1`,
              [tenantId]
            );

            let subjectId;
            if (subjectRes.rows.length > 0) {
              subjectId = subjectRes.rows[0].id;
            } else {
              // Create a default subject
              const newSubjectRes = await client.query(
                `INSERT INTO subjects (tenant_id, name, code)
                 VALUES ($1, 'Chung', 'CHUNG')
                 RETURNING id`,
                [tenantId]
              );
              subjectId = newSubjectRes.rows[0].id;
            }

            // Create Class with default dates (today to +6 months)
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

        // 3. Enroll Student
        await client.query(
          `INSERT INTO class_students (tenant_id, class_id, student_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (class_id, student_id) DO NOTHING`,
          [tenantId, classId, studentId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      students_count: createdStudents.length,
      classes_count: createdClasses.size,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

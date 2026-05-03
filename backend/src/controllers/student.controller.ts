import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { checkPlanLimit } from '../utils/limitChecker';
import { NotFoundError, ValidationError } from '../utils/errors';

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

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { full_name, email, phone, date_of_birth, branch_id } = req.body;

    if (!full_name || !email || !branch_id) {
      throw new ValidationError('Vui lòng điền đầy đủ thông tin bắt buộc', 'MISSING_REQUIRED_FIELDS');
    }

    // Check Plan Limit
    await checkPlanLimit(tenantId as string, 'max_students', 'students', 'LIMIT_EXCEEDED');

    const result = await pool.query(
      `INSERT INTO students (tenant_id, branch_id, full_name, email, phone, date_of_birth) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, branch_id, full_name, email, phone, date_of_birth]
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
    const { full_name, phone, date_of_birth, branch_id, is_active } = req.body;

    const result = await pool.query(
      `UPDATE students 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           date_of_birth = COALESCE($3, date_of_birth),
           branch_id = COALESCE($4, branch_id),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [full_name, phone, date_of_birth, branch_id, is_active, id, tenantId]
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

import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { checkPlanLimit } from '../utils/limitChecker';
import { NotFoundError, ValidationError } from '../utils/errors';

export const getClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    const result = await pool.query(
      `SELECT c.*, b.name as branch_name, t.full_name as teacher_name 
       FROM classes c
       LEFT JOIN branches b ON c.branch_id = b.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE c.tenant_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at DESC`,
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date } = req.body;

    if (!branch_id || !name) {
      throw new ValidationError('Vui lòng điền tên lớp và chi nhánh', 'MISSING_REQUIRED_FIELDS');
    }

    // Check Plan Limit
    await checkPlanLimit(tenantId as string, 'max_classes', 'classes', 'LIMIT_EXCEEDED');

    let actualSubjectId = subject_id;
    if (!actualSubjectId) {
      const subjectRes = await pool.query(`SELECT id FROM subjects WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
      if (subjectRes.rows.length > 0) {
        actualSubjectId = subjectRes.rows[0].id;
      } else {
        const newSub = await pool.query(`INSERT INTO subjects (tenant_id, name, code) VALUES ($1, 'General', 'GEN') RETURNING id`, [tenantId]);
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

    const newClass = await pool.query(insertSql, insertParams);

    res.status(201).json(newClass.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date, status } = req.body;

    const result = await pool.query(
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

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
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

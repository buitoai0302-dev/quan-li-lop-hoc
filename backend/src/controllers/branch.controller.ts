import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { checkPlanLimit } from '../utils/limitChecker';
import { NotFoundError, ValidationError } from '../utils/errors';
import { FeatureFlagService } from '../services/feature-flag.service';

export const getBranches = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    const result = await pool.query(
      `SELECT * FROM branches WHERE tenant_id = $1 AND is_deleted = false ORDER BY created_at ASC`,
      [tenantId]
    );

    const limit = await FeatureFlagService.checkLimit(tenantId as string, 'max_branches');
    if (limit > 0) {
      return res.json(result.rows.slice(0, limit));
    }

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { name, address, phone } = req.body;

    if (!name) {
      throw new ValidationError('Vui lòng điền tên chi nhánh', 'MISSING_REQUIRED_FIELDS');
    }

    // Check Plan Limit
    await checkPlanLimit(tenantId as string, 'max_branches', 'branches', 'LIMIT_EXCEEDED');

    const result = await pool.query(
      `INSERT INTO branches (tenant_id, name, address, phone) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [tenantId, name, address, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { name, address, phone, is_active } = req.body;

    const result = await pool.query(
      `UPDATE branches 
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           phone = COALESCE($3, phone),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [name, address, phone, is_active, id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy chi nhánh', 'BRANCH_NOT_FOUND');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE branches SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy chi nhánh', 'BRANCH_NOT_FOUND');
    }

    res.json({ success: true, message: 'Chi nhánh đã được xóa thành công' });
  } catch (error) {
    next(error);
  }
};

export const updateFirstBranch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { name, address, phone } = req.body;

    if (!name) {
      throw new ValidationError('Tên chi nhánh không được để trống', 'MISSING_REQUIRED_FIELDS');
    }

    // Bước 1: Tìm chi nhánh đầu tiên của tenant
    const findResult = await pool.query(
      `SELECT id FROM branches WHERE tenant_id = $1 AND is_deleted = false ORDER BY created_at ASC LIMIT 1`,
      [tenantId]
    );

    let result;
    if (findResult.rows.length > 0) {
      // Cập nhật chi nhánh đã có
      result = await pool.query(
        `UPDATE branches 
         SET name = $1, address = COALESCE($2, address), phone = COALESCE($3, phone)
         WHERE id = $4 AND tenant_id = $5 RETURNING *`,
        [name, address, phone, findResult.rows[0].id, tenantId]
      );
    } else {
      // Chưa có chi nhánh → tạo mới
      result = await pool.query(
        `INSERT INTO branches (tenant_id, name, address, phone) VALUES ($1, $2, $3, $4) RETURNING *`,
        [tenantId, name, address, phone]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

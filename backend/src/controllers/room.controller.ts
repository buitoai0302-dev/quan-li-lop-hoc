import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { checkPlanLimit } from '../utils/limitChecker';
import { NotFoundError, ValidationError } from '../utils/errors';

export const getRooms = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    const result = await pool.query(
      `SELECT r.*, b.name as branch_name 
       FROM rooms r
       LEFT JOIN branches b ON r.branch_id = b.id
       WHERE r.tenant_id = $1 AND r.is_deleted = false
       ORDER BY r.name ASC`,
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { branch_id, name, capacity, type } = req.body;

    if (!branch_id || !name) {
      throw new ValidationError('Vui lòng điền tên phòng và chi nhánh', 'MISSING_REQUIRED_FIELDS');
    }

    // Check Plan Limit
    await checkPlanLimit(tenantId as string, 'max_rooms', 'rooms', 'LIMIT_EXCEEDED');

    const result = await pool.query(
      `INSERT INTO rooms (tenant_id, branch_id, name, capacity, type) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, branch_id, name, capacity || 30, type || 'classroom']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { branch_id, name, capacity, type, is_active } = req.body;

    const result = await pool.query(
      `UPDATE rooms 
       SET branch_id = COALESCE($1, branch_id),
           name = COALESCE($2, name),
           capacity = COALESCE($3, capacity),
           type = COALESCE($4, type),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [branch_id, name, capacity, type, is_active, id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy phòng học', 'ROOM_NOT_FOUND');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE rooms SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy phòng học', 'ROOM_NOT_FOUND');
    }

    res.json({ success: true, message: 'Phòng học đã được xóa thành công' });
  } catch (error) {
    next(error);
  }
};

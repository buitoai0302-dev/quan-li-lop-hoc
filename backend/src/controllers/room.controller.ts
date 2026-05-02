import { Request, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getRooms = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    const result = await pool.query(
      `SELECT r.*, b.name as branch_name 
       FROM rooms r
       JOIN branches b ON r.branch_id = b.id
       WHERE r.tenant_id = $1 AND r.is_deleted = false
       ORDER BY r.created_at DESC`,
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { branch_id, name, capacity, room_type } = req.body;

    if (!branch_id || !name) {
      return res.status(400).json({ error: 'Branch ID and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO rooms (tenant_id, branch_id, name, capacity, room_type) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, branch_id, name, capacity || 30, room_type || 'classroom']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { branch_id, name, capacity, room_type, is_active } = req.body;

    const result = await pool.query(
      `UPDATE rooms 
       SET branch_id = COALESCE($1, branch_id),
           name = COALESCE($2, name),
           capacity = COALESCE($3, capacity),
           room_type = COALESCE($4, room_type),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [branch_id, name, capacity, room_type, is_active, id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRoom = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE rooms SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

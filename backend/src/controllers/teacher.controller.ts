import { Request, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getTeachers = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    const result = await pool.query(
      `SELECT t.*, b.name as branch_name 
       FROM teachers t
       LEFT JOIN branches b ON t.branch_id = b.id
       WHERE t.tenant_id = $1 AND t.is_deleted = false
       ORDER BY t.created_at DESC`,
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { full_name, email, phone, specialization, branch_id } = req.body;

    if (!full_name || !email || !branch_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO teachers (tenant_id, branch_id, full_name, email, phone, specialization) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, branch_id, full_name, email, phone, specialization]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating teacher:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { full_name, phone, specialization, branch_id, is_active } = req.body;

    const result = await pool.query(
      `UPDATE teachers 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           specialization = COALESCE($3, specialization),
           branch_id = COALESCE($4, branch_id),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [full_name, phone, specialization, branch_id, is_active, id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE teachers SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

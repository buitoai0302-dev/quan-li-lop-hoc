import { Request, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getClasses = async (req: AuthRequest, res: Response) => {
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
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date } = req.body;

    if (!branch_id || !name) {
      return res.status(400).json({ error: 'Branch ID and Name are required' });
    }

    let actualSubjectId = subject_id;
    if (!actualSubjectId) {
      const subjectRes = await pool.query(`SELECT id FROM subjects WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
      if (subjectRes.rows.length > 0) {
        actualSubjectId = subjectRes.rows[0].id;
      } else {
        // Create a default subject if none exists
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
  } catch (error: any) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateClass = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date, status } = req.body;

    const updateSql = `
      UPDATE classes 
      SET branch_id = COALESCE($1, branch_id),
          subject_id = COALESCE($2, subject_id),
          teacher_id = $3,
          name = COALESCE($4, name),
          max_capacity = COALESCE($5, max_capacity),
          start_date = COALESCE($6, start_date),
          end_date = COALESCE($7, end_date),
          status = COALESCE($8, status)
      WHERE id = $9 AND tenant_id = $10
      RETURNING *
    `;
    const updateParams = [branch_id, subject_id || null, teacher_id || null, name, max_capacity, start_date || null, end_date || null, status, id, tenantId];

    const result = await pool.query(updateSql, updateParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteClass = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE classes SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

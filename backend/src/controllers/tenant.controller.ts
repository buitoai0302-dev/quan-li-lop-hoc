import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      'SELECT id, name, domain, contact_email FROM tenants WHERE id = $1 AND is_active = true',
      [tenantId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in getTenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, contact_email } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'Tenant name is required' });
      return;
    }

    const result = await pool.query(
      `UPDATE tenants 
       SET name = $1, contact_email = $2, updated_at = NOW() 
       WHERE id = $3 AND is_active = true 
       RETURNING id, name, domain, contact_email`,
      [name, contact_email, tenantId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in updateTenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

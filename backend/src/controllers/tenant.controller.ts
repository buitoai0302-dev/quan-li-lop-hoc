import { Response } from 'express';
import crypto from 'crypto';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    
    // Check if plan supports API Access
    const planResult = await pool.query(`
      SELECT pf.is_enabled 
      FROM tenants t
      JOIN plan_features pf ON t.plan_id = pf.plan_id
      WHERE t.id = $1 AND pf.feature_key = 'api_access'
    `, [tenantId]);

    if (!planResult.rows[0]?.is_enabled) {
      res.json({ hasAccess: false, apiKey: null });
      return;
    }

    const result = await pool.query('SELECT api_key FROM tenants WHERE id = $1', [tenantId]);
    res.json({ hasAccess: true, apiKey: result.rows[0]?.api_key });
  } catch (error) {
    console.error('Error in getApiKey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;

    // Check if plan supports API Access
    const planResult = await pool.query(`
      SELECT pf.is_enabled 
      FROM tenants t
      JOIN plan_features pf ON t.plan_id = pf.plan_id
      WHERE t.id = $1 AND pf.feature_key = 'api_access'
    `, [tenantId]);

    if (!planResult.rows[0]?.is_enabled) {
      res.status(403).json({ error: 'API Access is not included in your current plan.' });
      return;
    }

    const newKey = `sk_${crypto.randomBytes(24).toString('hex')}`;
    await pool.query('UPDATE tenants SET api_key = $1 WHERE id = $2', [newKey, tenantId]);

    res.json({ apiKey: newKey });
  } catch (error) {
    console.error('Error in generateApiKey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      'SELECT id, name, domain, contact_email, plan_id FROM tenants WHERE id = $1 AND is_active = true',
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

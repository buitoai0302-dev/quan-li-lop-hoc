import { Request, Response } from 'express';
import pool from '../db';

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plansResult = await pool.query('SELECT * FROM plan_definitions WHERE is_active = true ORDER BY sort_order');
    const limitsResult = await pool.query('SELECT * FROM plan_limits');
    const featuresResult = await pool.query('SELECT * FROM plan_features');

    const plans = plansResult.rows.map(plan => ({
      ...plan,
      limits: limitsResult.rows.filter(l => l.plan_id === plan.id),
      features: featuresResult.rows.filter(f => f.plan_id === plan.id)
    }));

    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPlanRequest = async (req: Request, res: Response) => {
  const { planId, notes } = req.body;
  const tenantId = (req as any).user.tenantId;

  try {
    // Check if there is already a pending request for this tenant
    const existing = await pool.query(
      'SELECT id FROM plan_requests WHERE tenant_id = $1 AND status = $2',
      [tenantId, 'pending']
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending upgrade request.' });
    }

    const result = await pool.query(
      'INSERT INTO plan_requests (tenant_id, plan_id, notes) VALUES ($1, $2, $3) RETURNING *',
      [tenantId, planId, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPlanRequests = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, t.name as tenant_name, pd.name as plan_name 
      FROM plan_requests pr
      JOIN tenants t ON pr.tenant_id = t.id
      JOIN plan_definitions pd ON pr.plan_id = pd.id
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approvePlanRequest = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const requestResult = await pool.query('SELECT * FROM plan_requests WHERE id = $1', [id]);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const request = requestResult.rows[0];

    // Begin transaction
    await pool.query('BEGIN');

    // Update tenant plan
    await pool.query('UPDATE tenants SET plan_id = $1 WHERE id = $2', [request.plan_id, request.tenant_id]);

    // Update request status
    await pool.query('UPDATE plan_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['approved', id]);

    await pool.query('COMMIT');

    res.json({ message: 'Plan request approved and tenant updated successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

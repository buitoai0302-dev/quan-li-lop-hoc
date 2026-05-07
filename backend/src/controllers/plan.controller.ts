import { Request, Response } from 'express';
import { cache as planCache } from '../services/feature-flag.service';
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
      [tenantId, planId, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error in createPlanRequest:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPlanRequests = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, t.name as tenant_name, t.contact_email, pd.name as plan_name 
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
  const client = await pool.connect();

  try {
    const requestResult = await client.query('SELECT * FROM plan_requests WHERE id = $1 AND status = $2', [id, 'pending']);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }
    const request = requestResult.rows[0];

    await client.query('BEGIN');

    // Update tenant plan
    await client.query('UPDATE tenants SET plan_id = $1 WHERE id = $2', [request.plan_id, request.tenant_id]);

    // Update request status
    await client.query('UPDATE plan_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['approved', id]);

    await client.query('COMMIT');

    // Invalidate FeatureFlagService cache so tenant gets new plan immediately
    planCache.del(`tenant_plan_${request.tenant_id}`);

    res.json({ message: 'Plan request approved and tenant updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const rejectPlanRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE plan_requests SET status = $1, updated_at = NOW() WHERE id = $2 AND status = $3 RETURNING *',
      ['rejected', id, 'pending']
    );
    await client.query('COMMIT');

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }
    res.json({ message: 'Plan request rejected' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const getPlanRequestStatus = async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenantId;

  try {
    const result = await pool.query(
      'SELECT status, plan_id FROM plan_requests WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [tenantId, 'pending']
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    // Return with 'requested_plan_id' key so frontend doesn't need to change
    res.json({ ...result.rows[0], requested_plan_id: result.rows[0].plan_id });
  } catch (err) {
    console.error('Error in getPlanRequestStatus:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ValidationError, NotFoundError } from '../utils/errors';

// ─── System Stats ────────────────────────────────────────────────────────────

export const getSystemStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [tenantsRes, usersRes, sessionsRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM tenants'),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM schedule_sessions WHERE status != 'cancelled'"),
    ]);

    res.json({
      totalTenants: parseInt(tenantsRes.rows[0].count, 10),
      totalUsers: parseInt(usersRes.rows[0].count, 10),
      totalSessions: parseInt(sessionsRes.rows[0].count, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Tenant Management ───────────────────────────────────────────────────────

export const getAllTenants = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.name, t.domain, t.contact_email, t.plan_id, t.is_active, t.status, t.created_at,
              p.name as plan_name, p.code as plan_code,
              (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
              (SELECT COUNT(*) FROM branches WHERE tenant_id = t.id) as branch_count
       FROM tenants t
       JOIN plan_definitions p ON t.plan_id = p.id
       ORDER BY t.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { planId, isActive, status } = req.body;

    if (!planId && isActive === undefined && !status) {
      throw new ValidationError(
        'At least one field is required (planId, isActive, or status)',
        'MISSING_REQUIRED_FIELDS'
      );
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (planId) {
      params.push(planId);
      updates.push(`plan_id = $${params.length}`);
    }

    if (isActive !== undefined) {
      params.push(isActive);
      updates.push(`is_active = $${params.length}`);
    }

    if (status) {
      params.push(status);
      updates.push(`status = $${params.length}`);
      // Auto-sync is_active based on status
      if (status === 'active') {
        updates.push(`is_active = true`);
      } else {
        updates.push(`is_active = false`);
      }
    }

    params.push(id);
    const sql = `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;

    const result = await pool.query(sql, params);

    if (result.rowCount === 0) {
      throw new NotFoundError('Tenant not found', 'NOT_FOUND');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ─── Plan Management ──────────────────────────────────────────────────────────

export const getPlans = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plansResult = await pool.query('SELECT * FROM plan_definitions ORDER BY sort_order');
    const plans = plansResult.rows;

    // Fetch limits and features for each plan
    const plansWithDetails = await Promise.all(
      plans.map(async (plan) => {
        const [limitsRes, featuresRes] = await Promise.all([
          pool.query('SELECT limit_key, limit_value FROM plan_limits WHERE plan_id = $1', [
            plan.id,
          ]),
          pool.query('SELECT feature_key, is_enabled FROM plan_features WHERE plan_id = $1', [
            plan.id,
          ]),
        ]);

        return {
          ...plan,
          limits: limitsRes.rows.reduce(
            (acc: any, row: any) => ({ ...acc, [row.limit_key]: row.limit_value }),
            {}
          ),
          features: featuresRes.rows.reduce(
            (acc: any, row: any) => ({ ...acc, [row.feature_key]: row.is_enabled }),
            {}
          ),
        };
      })
    );

    res.json(plansWithDetails);
  } catch (error) {
    next(error);
  }
};

export const updatePlanDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, priceVnd, priceUsd, isActive, limits, features } = req.body;

    await pool.query('BEGIN');

    if (name || priceVnd !== undefined || priceUsd !== undefined || isActive !== undefined) {
      const updates: string[] = [];
      const params: any[] = [];
      if (name) {
        params.push(name);
        updates.push(`name = $${params.length}`);
      }
      if (priceVnd !== undefined) {
        params.push(priceVnd);
        updates.push(`price_vnd = $${params.length}`);
      }
      if (priceUsd !== undefined) {
        params.push(priceUsd);
        updates.push(`price_usd = $${params.length}`);
      }
      if (isActive !== undefined) {
        params.push(isActive);
        updates.push(`is_active = $${params.length}`);
      }
      params.push(id);
      await pool.query(
        `UPDATE plan_definitions SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params
      );
    }

    if (limits) {
      const ALLOWED_LIMIT_KEYS = [
        'max_branches',
        'max_classes',
        'max_students',
        'max_teachers',
        'max_rooms',
      ];
      for (const [key, value] of Object.entries(limits)) {
        if (!ALLOWED_LIMIT_KEYS.includes(key)) continue; // Silently skip unknown keys
        await pool.query(
          'INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES ($1, $2, $3) ON CONFLICT (plan_id, limit_key) DO UPDATE SET limit_value = $3',
          [id, key, value]
        );
      }
    }

    if (features) {
      const ALLOWED_FEATURE_KEYS = [
        'google_calendar_sync',
        'attendance_tracking',
        'advanced_analytics',
        'api_access',
        'multi_branch',
        'custom_domain',
        'yearly_chart',
      ];
      for (const [key, value] of Object.entries(features)) {
        if (!ALLOWED_FEATURE_KEYS.includes(key)) continue; // Silently skip unknown keys
        await pool.query(
          'INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES ($1, $2, $3) ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = $3',
          [id, key, value]
        );
      }
    }

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Plan updated successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
};

import pool from '../db';
import crypto from 'crypto';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';

export class TenantService {
  static async getApiKey(tenantId: string) {
    const planResult = await pool.query(
      `
      SELECT pf.is_enabled 
      FROM tenants t
      JOIN plan_features pf ON t.plan_id = pf.plan_id
      WHERE t.id = $1 AND pf.feature_key = 'api_access'
    `,
      [tenantId]
    );

    if (!planResult.rows[0]?.is_enabled) {
      return { hasAccess: false, apiKey: null };
    }

    const result = await pool.query('SELECT api_key FROM tenants WHERE id = $1', [tenantId]);
    return { hasAccess: true, apiKey: result.rows[0]?.api_key };
  }

  static async generateApiKey(tenantId: string) {
    const planResult = await pool.query(
      `
      SELECT pf.is_enabled 
      FROM tenants t
      JOIN plan_features pf ON t.plan_id = pf.plan_id
      WHERE t.id = $1 AND pf.feature_key = 'api_access'
    `,
      [tenantId]
    );

    if (!planResult.rows[0]?.is_enabled) {
      throw new ForbiddenError('API Access is not included in your current plan.');
    }

    const newKey = `sk_${crypto.randomBytes(24).toString('hex')}`;
    await pool.query('UPDATE tenants SET api_key = $1 WHERE id = $2', [newKey, tenantId]);

    return { apiKey: newKey };
  }

  static async getTenant(tenantId: string) {
    const result = await pool.query(
      'SELECT id, name, domain, contact_email, plan_id, settings FROM tenants WHERE id = $1 AND is_active = true',
      [tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Tenant not found');
    }

    return result.rows[0];
  }

  static async updateTenant(tenantId: string, data: any) {
    const { name, contact_email, settings } = data;

    if (!name || name.trim() === '') {
      throw new ValidationError('Tenant name is required');
    }

    const result = await pool.query(
      `UPDATE tenants 
       SET name = $1, contact_email = $2, settings = COALESCE($3, settings), updated_at = NOW() 
       WHERE id = $4 AND is_active = true 
       RETURNING id, name, domain, contact_email, settings`,
      [name, contact_email, settings ? JSON.stringify(settings) : null, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Tenant not found');
    }

    return result.rows[0];
  }
}

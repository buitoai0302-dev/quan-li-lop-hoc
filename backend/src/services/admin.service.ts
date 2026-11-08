import pool from '../db';
import { ValidationError, NotFoundError } from '../utils/errors';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendPasswordResetEmail } from './email.service';
import { logger } from '../utils/logger';
import { ERROR_CODES, ROLES } from '../utils/constants';
import { getFreePlanId } from '../utils/plans';

export class AdminService {
  static async getSystemStats() {
    const [tenantsRes, usersRes, sessionsRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM tenants'),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM schedule_sessions WHERE status != 'cancelled'"),
    ]);

    return {
      totalTenants: parseInt(tenantsRes.rows[0].count, 10),
      totalUsers: parseInt(usersRes.rows[0].count, 10),
      totalSessions: parseInt(sessionsRes.rows[0].count, 10),
      timestamp: new Date().toISOString(),
    };
  }

  static async getAllTenants() {
    const result = await pool.query(
      `SELECT t.id, t.name, t.domain, t.contact_email, t.plan_id, t.is_active, t.status, t.created_at, t.settings,
              p.name as plan_name, p.code as plan_code,
              (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
              (SELECT COUNT(*) FROM branches WHERE tenant_id = t.id) as branch_count
       FROM tenants t
       LEFT JOIN plan_definitions p ON t.plan_id = p.id
       ORDER BY t.created_at DESC`
    );
    return result.rows;
  }

  static async updateTenant(id: string, data: any) {
    const { planId, isActive, status, settings } = data;

    if (!planId && isActive === undefined && !status && !settings) {
      throw new ValidationError(
        'At least one field is required (planId, isActive, status, or settings)',
        ERROR_CODES.MISSING_REQUIRED_FIELDS
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
      if (status === 'active') {
        updates.push(`is_active = true`);
      } else {
        updates.push(`is_active = false`);
      }
    }

    if (settings) {
      params.push(settings);
      updates.push(`settings = $${params.length}`);
    }

    params.push(id);
    const sql = `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;

    const result = await pool.query(sql, params);

    if (result.rowCount === 0) {
      throw new NotFoundError('Tenant not found', ERROR_CODES.NOT_FOUND);
    }

    return result.rows[0];
  }

  static async getPlans() {
    const plansResult = await pool.query('SELECT * FROM plan_definitions ORDER BY sort_order');
    const plans = plansResult.rows;

    if (plans.length === 0) return [];

    const planIds = plans.map((p) => p.id);
    const placeholders = planIds.map((_: any, i: number) => `$${i + 1}`).join(', ');

    const [limitsRes, featuresRes] = await Promise.all([
      pool.query(
        `SELECT plan_id, limit_key, limit_value FROM plan_limits WHERE plan_id IN (${placeholders})`,
        planIds
      ),
      pool.query(
        `SELECT plan_id, feature_key, is_enabled FROM plan_features WHERE plan_id IN (${placeholders})`,
        planIds
      ),
    ]);

    const limitsMap: Record<string, Record<string, any>> = {};
    const featuresMap: Record<string, Record<string, any>> = {};

    for (const row of limitsRes.rows) {
      if (!limitsMap[row.plan_id]) limitsMap[row.plan_id] = {};
      limitsMap[row.plan_id][row.limit_key] = row.limit_value;
    }
    for (const row of featuresRes.rows) {
      if (!featuresMap[row.plan_id]) featuresMap[row.plan_id] = {};
      featuresMap[row.plan_id][row.feature_key] = row.is_enabled;
    }

    return plans.map((plan: any) => ({
      ...plan,
      limits: limitsMap[plan.id] || {},
      features: featuresMap[plan.id] || {},
    }));
  }

  static async updatePlanDetails(id: string, data: any) {
    const { name, priceVnd, priceUsd, yearlyPriceVnd, yearlyPriceUsd, isActive, limits, features } =
      data;

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

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
        if (yearlyPriceVnd !== undefined) {
          params.push(yearlyPriceVnd);
          updates.push(`yearly_price_vnd = $${params.length}`);
        }
        if (yearlyPriceUsd !== undefined) {
          params.push(yearlyPriceUsd);
          updates.push(`yearly_price_usd = $${params.length}`);
        }
        params.push(id);
        await client.query(
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
          if (!ALLOWED_LIMIT_KEYS.includes(key)) continue;
          await client.query(
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
          if (!ALLOWED_FEATURE_KEYS.includes(key)) continue;
          await client.query(
            'INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES ($1, $2, $3) ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = $3',
            [id, key, value]
          );
        }
      }

      await client.query('COMMIT');
      return { success: true, message: 'Plan updated successfully' };
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  static async getAllUsers(query: any) {
    const { search, role, tenant_id } = query;

    let sql = `
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.is_email_verified, u.created_at,
             t.id as tenant_id, t.name as tenant_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    }
    if (role) {
      params.push(role);
      sql += ` AND u.role = $${params.length}`;
    }
    if (tenant_id) {
      params.push(tenant_id);
      sql += ` AND u.tenant_id = $${params.length}`;
    }

    sql += ' ORDER BY u.created_at DESC';

    const result = await pool.query(sql, params);
    return result.rows;
  }

  static async createUser(data: any) {
    const { email, role, full_name, tenant_id, new_tenant_name, plan_id } = data;

    if (!email || !role || !full_name || !tenant_id) {
      throw new ValidationError('Thiếu thông tin bắt buộc (email, role, full_name, tenant_id)');
    }

    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const setupToken = crypto.randomUUID();
    const setupExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let targetTenantId = tenant_id;
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rowCount && existing.rowCount > 0) {
        throw new ValidationError('Email này đã được sử dụng trong hệ thống');
      }

      if (tenant_id === 'NEW') {
        if (!new_tenant_name) {
          throw new ValidationError('Tên trung tâm mới không được để trống');
        }

        const defaultPlanId = plan_id || (await getFreePlanId(client));
        const tenantResult = await client.query(
          `INSERT INTO tenants (name, domain, plan_id, status, is_active) 
           VALUES ($1, $2, $3, 'active', true) RETURNING id`,
          [new_tenant_name, `tenant-${Date.now()}`, defaultPlanId]
        );
        targetTenantId = tenantResult.rows[0].id;
      }

      const userResult = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_email_verified,
           is_active, reset_password_token, reset_password_expires)
         VALUES ($1, $2, $3, $4, $5, false, true, $6, $7)
         RETURNING id, email, full_name, role, tenant_id`,
        [targetTenantId, email, passwordHash, full_name, role, setupToken, setupExpires]
      );

      await client.query('COMMIT');

      sendPasswordResetEmail(email, setupToken).catch((err) =>
        logger.error(err, '[Admin] Failed to send account setup email:')
      );

      return {
        success: true,
        user: userResult.rows[0],
        message: 'Người dùng đã được tạo. Liên kết đặt mật khẩu đã được gửi qua email.',
      };
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  static async resetUserPassword(id: string, _data: any) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const resetToken = crypto.randomUUID();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    const result = await pool.query(
      `UPDATE users SET password_hash = $1, reset_password_token = $2,
         reset_password_expires = $3 WHERE id = $4 RETURNING id, email, full_name`,
      [passwordHash, resetToken, resetExpires, id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }

    const userEmail = result.rows[0].email;
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    sendPasswordResetEmail(userEmail, resetToken).catch((err) =>
      logger.error(err, '[Admin] Failed to send reset password email:')
    );

    return {
      success: true,
      message: 'Liên kết đặt lại mật khẩu đã được gửi qua email.',
    };
  }

  static async toggleUserStatus(id: string) {
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active',
      [id]
    );
    if (result.rows[0] && !result.rows[0].is_active) {
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    }

    if (result.rowCount === 0) {
      throw new NotFoundError('User not found');
    }

    return {
      success: true,
      is_active: result.rows[0].is_active,
      message: 'Status updated successfully',
    };
  }

  static async importUsers(tenant_id: string, data: any[]) {
    if (!tenant_id || !Array.isArray(data) || data.length === 0) {
      throw new ValidationError(
        'Invalid data or missing tenant_id',
        ERROR_CODES.INVALID_IMPORT_DATA
      );
    }

    let successCount = 0;
    let skipCount = 0;

    for (const row of data) {
      const client = await pool.connect();
      try {
        const { full_name, email, role } = row;
        if (!full_name || !email || !role) {
          skipCount++;
          continue;
        }

        await client.query('BEGIN');

        const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        const setupToken = crypto.randomUUID();
        const setupExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Check if user exists
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
          await client.query('ROLLBACK');
          skipCount++;
          continue;
        }

        // An imported account becomes usable only after the owner sets a password.
        const result = await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, full_name, role,
             is_email_verified, is_active, onboarding_completed, reset_password_token, reset_password_expires)
           VALUES ($1, $2, $3, $4, $5, false, true, true, $6, $7) RETURNING id`,
          [tenant_id, email, passwordHash, full_name, role, setupToken, setupExpires]
        );

        if (result.rowCount && result.rowCount > 0) {
          // Create profile if role is teacher or student
          if (role === ROLES.TEACHER) {
            // Find a default branch for the tenant if exists, or pass null if nullable
            const branchRes = await client.query(
              'SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1',
              [tenant_id]
            );
            const branchId = branchRes.rows.length > 0 ? branchRes.rows[0].id : null;
            await client.query(
              `INSERT INTO teachers (tenant_id, branch_id, full_name, email) VALUES ($1, $2, $3, $4)`,
              [tenant_id, branchId, full_name, email]
            );
          } else if (role === ROLES.STUDENT) {
            const branchRes = await client.query(
              'SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1',
              [tenant_id]
            );
            const branchId = branchRes.rows.length > 0 ? branchRes.rows[0].id : null;
            await client.query(
              `INSERT INTO students (tenant_id, branch_id, full_name, email) VALUES ($1, $2, $3, $4)`,
              [tenant_id, branchId, full_name, email]
            );
          }

          await client.query('COMMIT');
          sendPasswordResetEmail(email, setupToken).catch((err) =>
            logger.error(err, '[Admin] Failed to send account setup email:')
          );
          successCount++;
        } else {
          await client.query('ROLLBACK');
          skipCount++;
        }
      } catch (err) {
        await client.query('ROLLBACK');
        skipCount++;
        logger.error({ err }, `Error importing user:`);
      } finally {
        client.release();
      }
    }

    return {
      success: true,
      message: `Imported ${successCount} users. Skipped ${skipCount} error records.`,
      successCount,
      skipCount,
    };
  }
}

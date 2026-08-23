import pool from '../db';
import { ValidationError, NotFoundError } from '../utils/errors';
import bcrypt from 'bcrypt';
import { sendNewUserPasswordEmail } from './email.service';
import { logger } from '../utils/logger';

const generateRandomPassword = (length = 10) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

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
      throw new NotFoundError('Tenant not found', 'NOT_FOUND');
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
    const { email, role, full_name, tenant_id, new_tenant_name, plan_id, password } = data;

    if (!email || !role || !full_name || !tenant_id) {
      throw new ValidationError('Thiếu thông tin bắt buộc (email, role, full_name, tenant_id)');
    }

    const finalPassword = password || generateRandomPassword();
    const passwordHash = await bcrypt.hash(finalPassword, 10);

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

        const defaultPlanId = plan_id || 'ffffffff-0000-0000-0000-000000000001';
        const tenantResult = await client.query(
          `INSERT INTO tenants (name, domain, plan_id, status, is_active) 
           VALUES ($1, $2, $3, 'active', true) RETURNING id`,
          [new_tenant_name, `tenant-${Date.now()}`, defaultPlanId]
        );
        targetTenantId = tenantResult.rows[0].id;
      }

      const userResult = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_email_verified, is_active)
         VALUES ($1, $2, $3, $4, $5, true, true) RETURNING id, email, full_name, role, tenant_id`,
        [targetTenantId, email, passwordHash, full_name, role]
      );

      await client.query('COMMIT');

      sendNewUserPasswordEmail(email, full_name, finalPassword).catch((err) =>
        logger.error(err, '[Admin] Failed to send new user password email:')
      );

      return {
        success: true,
        user: userResult.rows[0],
        message: 'Người dùng đã được tạo thành công. Mật khẩu đã được gửi qua email.',
      };
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  static async resetUserPassword(id: string, data: any) {
    const { password } = data;
    const finalPassword = password || generateRandomPassword();
    const passwordHash = await bcrypt.hash(finalPassword, 10);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email, full_name',
      [passwordHash, id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }

    const userEmail = result.rows[0].email;
    const userFullName = result.rows[0].full_name || userEmail;

    sendNewUserPasswordEmail(userEmail, userFullName, finalPassword).catch((err) =>
      logger.error(err, '[Admin] Failed to send reset password email:')
    );

    return {
      success: true,
      message: 'Cấp lại mật khẩu thành công. Mật khẩu mới đã được gửi qua email.',
      rawPassword: finalPassword,
    };
  }

  static async toggleUserStatus(id: string) {
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active',
      [id]
    );

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
      throw new ValidationError('Invalid data or missing tenant_id', 'INVALID_IMPORT_DATA');
    }

    let successCount = 0;
    let skipCount = 0;

    for (const row of data) {
      const client = await pool.connect();
      try {
        const { full_name, email, role, password } = row;
        if (!full_name || !email || !role) {
          skipCount++;
          continue;
        }

        await client.query('BEGIN');

        // Generate password if not provided
        const finalPassword = password || email.split('@')[0];
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(finalPassword, salt);

        // Check if user exists
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
          await client.query('ROLLBACK');
          skipCount++;
          continue;
        }

        // Insert user (is_email_verified = true, is_active = true)
        const result = await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_email_verified, is_active, onboarding_completed) 
           VALUES ($1, $2, $3, $4, $5, true, true, true) RETURNING id`,
          [tenant_id, email, passwordHash, full_name, role]
        );

        if (result.rowCount && result.rowCount > 0) {
          await client.query('COMMIT');
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

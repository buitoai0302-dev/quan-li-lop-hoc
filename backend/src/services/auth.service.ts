import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db';
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  checkEmailRateLimit,
  recordEmailAttempt,
} from './rateLimit.service';
import {
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import { config } from '../utils/config';
import { PLAN_CODES, TENANT_STATUS, DEFAULT_FREE_PLAN_ID, ROLES } from '../utils/constants';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  static validatePassword(password: string): { valid: boolean; errorCode?: string } {
    if (password.length < 8) return { valid: false, errorCode: 'passwordStrength.minLength' };
    if (!/[A-Z]/.test(password))
      return { valid: false, errorCode: 'passwordStrength.hasUppercase' };
    if (!/[0-9]/.test(password)) return { valid: false, errorCode: 'passwordStrength.hasNumber' };
    return { valid: true };
  }

  static async issueTokens(user: any) {
    const payload = {
      userId: user.id || user.user_id,
      tenantId: user.tenant_id,
      branchId: user.branch_id,
      role: user.role,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, config.jwtSecret(), {
      expiresIn: config.jwtExpiresIn() as any,
    });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [payload.userId, refreshToken, expiresAt]
    );

    return { accessToken, refreshToken };
  }

  static async login(email: string, password: string, ip: string) {
    const rateCheck = await checkRateLimit(ip, email);
    if (rateCheck.blocked) {
      throw {
        status: 429,
        error: `Too many failed attempts. Try again in ${Math.ceil(rateCheck.retryAfter! / 60)} min.`,
        code: 'TOO_MANY_ATTEMPTS',
        retryAfter: rateCheck.retryAfter,
      };
    }

    const result = await pool.query(
      `SELECT u.*, t.name as tenant_name, t.plan_id, t.is_active as tenant_active, t.settings as tenant_settings, pd.code as plan_code,
              (SELECT COALESCE(json_object_agg(feature_key, is_enabled), '{}'::json) FROM plan_features WHERE plan_id = t.plan_id) as plan_features
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
       JOIN plan_definitions pd ON t.plan_id = pd.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      await recordFailedAttempt(ip, email);
      throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const user = result.rows[0];

    if (user.role !== ROLES.SUPER_ADMIN && !user.tenant_active) {
      throw new ForbiddenError('Your center is inactive or suspended', 'TENANT_INACTIVE');
    }

    if (!user.is_email_verified) {
      throw new ForbiddenError('Email not verified', 'EMAIL_NOT_VERIFIED');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await recordFailedAttempt(ip, email);
      const remaining = (await checkRateLimit(ip, email)).remainingAttempts;
      throw new AuthenticationError(
        `Invalid email or password. ${remaining} attempts left.`,
        'INVALID_CREDENTIALS'
      );
    }

    await clearAttempts(ip, email);

    const { accessToken, refreshToken } = await this.issueTokens(user);
    const { password_hash, verification_token, reset_password_token, ...userWithoutSensitive } =
      user;

    return { accessToken, refreshToken, user: userWithoutSensitive };
  }

  static async googleLogin(credential: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AuthenticationError('Invalid Google token', 'INVALID_CREDENTIALS');
    }

    const email = payload.email;
    const fullName = payload.name || email.split('@')[0];

    const result = await pool.query(
      `SELECT u.*, t.name as tenant_name, t.plan_id, t.is_active as tenant_active, t.settings as tenant_settings, pd.code as plan_code,
              (SELECT COALESCE(json_object_agg(feature_key, is_enabled), '{}'::json) FROM plan_features WHERE plan_id = t.plan_id) as plan_features
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
       JOIN plan_definitions pd ON t.plan_id = pd.id
       WHERE u.email = $1`,
      [email]
    );

    let user;

    if (result.rows.length === 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const planResult = await client.query(
          `SELECT id, code FROM plan_definitions WHERE code = $1`,
          [PLAN_CODES.FREE]
        );
        const planId = planResult.rows[0]?.id || DEFAULT_FREE_PLAN_ID;
        const planCode = planResult.rows[0]?.code || 'FREE';

        const tenantResult = await client.query(
          'INSERT INTO tenants (plan_id, name, status, is_active, contact_email) VALUES ($1, $2, $3, true, $4) RETURNING id, name as tenant_name, plan_id, is_active as tenant_active, settings as tenant_settings',
          [planId, `Center of ${fullName}`, TENANT_STATUS.ACTIVE, email]
        );
        const newTenant = tenantResult.rows[0];

        const dummyPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
        const userResult = await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_email_verified) 
           VALUES ($1, $2, $3, $4, 'admin', true) RETURNING *`,
          [newTenant.id, email, dummyPassword, fullName]
        );
        user = {
          ...userResult.rows[0],
          tenant_name: newTenant.tenant_name,
          plan_id: newTenant.plan_id,
          tenant_active: newTenant.tenant_active,
          tenant_settings: newTenant.tenant_settings,
          plan_code: planCode,
          plan_features: {},
        };

        await client.query(`INSERT INTO branches (tenant_id, name) VALUES ($1, $2)`, [
          newTenant.id,
          'Chi nhánh chính',
        ]);

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      user = result.rows[0];
    }

    if (user.role !== ROLES.SUPER_ADMIN && !user.tenant_active) {
      throw new ForbiddenError('Your center is inactive or suspended', 'TENANT_INACTIVE');
    }

    if (!user.is_email_verified) {
      await pool.query('UPDATE users SET is_email_verified = true WHERE id = $1', [user.id]);
    }

    const { accessToken, refreshToken } = await this.issueTokens(user);
    const { password_hash, verification_token, reset_password_token, ...userWithoutSensitive } =
      user;

    return { accessToken, refreshToken, user: userWithoutSensitive };
  }

  static async register(data: any) {
    const { email, password, fullName, tenantName } = data;

    const pwCheck = this.validatePassword(password);
    if (!pwCheck.valid) {
      throw new ValidationError('Weak password', pwCheck.errorCode);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        throw new ValidationError('Email already registered', 'EMAIL_ALREADY_EXISTS');
      }

      const planResult = await client.query(`SELECT id FROM plan_definitions WHERE code = $1`, [
        PLAN_CODES.FREE,
      ]);
      const planId = planResult.rows[0]?.id || DEFAULT_FREE_PLAN_ID;

      const tenantResult = await client.query(
        'INSERT INTO tenants (plan_id, name, status, is_active, contact_email) VALUES ($1, $2, $3, false, $4) RETURNING id, settings as tenant_settings',
        [planId, tenantName || `Center of ${fullName}`, TENANT_STATUS.PENDING, email]
      );
      const { id: tenantId } = tenantResult.rows[0];

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const verificationToken = crypto.randomUUID();
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_email_verified, verification_token, verification_token_expires) 
         VALUES ($1, $2, $3, $4, 'admin', false, $5, $6)`,
        [tenantId, email, passwordHash, fullName, verificationToken, tokenExpires]
      );

      await client.query(`INSERT INTO branches (tenant_id, name) VALUES ($1, $2)`, [
        tenantId,
        tenantName || 'Chi nhánh chính',
      ]);

      await client.query('COMMIT');
      await sendVerificationEmail(email, verificationToken);

      return { message: 'Success', code: 'REGISTER_SUCCESS' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async verifyEmail(token: string) {
    const result = await pool.query(
      `UPDATE users 
       SET is_email_verified = true, verification_token = NULL, verification_token_expires = NULL 
       WHERE verification_token = $1 
         AND (verification_token_expires IS NULL OR verification_token_expires > NOW())
       RETURNING id, tenant_id, is_email_verified`,
      [token]
    );

    if (result.rowCount === 0) {
      return {
        message: 'Success',
        code: 'VERIFY_EMAIL_SUCCESS',
        note: 'Already verified or double request',
      };
    }

    const { tenant_id } = result.rows[0];
    await pool.query(
      "UPDATE tenants SET is_active = true, status = 'active' WHERE id = $1 AND status = 'pending'",
      [tenant_id]
    );

    return { message: 'Success', code: 'VERIFY_EMAIL_SUCCESS' };
  }

  static async resendVerification(email: string, ip: string) {
    const rateCheck = await checkEmailRateLimit(ip);
    if (rateCheck.blocked) {
      throw new ForbiddenError(
        `Too many requests. Please try again in ${rateCheck.retryAfter} seconds.`,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    const result = await pool.query('SELECT id, is_email_verified FROM users WHERE email = $1', [
      email,
    ]);

    if (result.rows.length === 0 || result.rows[0].is_email_verified) {
      return { message: 'Sent if applicable', code: 'RESEND_VERIFICATION_SENT' };
    }

    const newToken = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE email = $3',
      [newToken, tokenExpires, email]
    );

    await recordEmailAttempt(ip);
    await sendVerificationEmail(email, newToken);
    return { message: 'Sent', code: 'RESEND_VERIFICATION_SENT' };
  }

  static async forgotPassword(email: string, ip: string) {
    const rateCheck = await checkEmailRateLimit(ip);
    if (rateCheck.blocked) {
      throw new ForbiddenError(
        `Too many requests. Please try again in ${rateCheck.retryAfter} seconds.`,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return { message: 'Sent if applicable', code: 'FORGOT_PASSWORD_SENT' };
    }

    const resetToken = crypto.randomUUID();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [resetToken, resetExpires, email]
    );

    await recordEmailAttempt(ip);
    await sendPasswordResetEmail(email, resetToken);
    return { message: 'Sent', code: 'FORGOT_PASSWORD_SENT' };
  }

  static async resetPassword(data: any) {
    const { token, password } = data;

    const pwCheck = this.validatePassword(password);
    if (!pwCheck.valid) {
      throw new ValidationError('Weak password', pwCheck.errorCode);
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Token expired', 'RESET_PASSWORD_EXPIRED');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.query(
      `UPDATE users 
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL 
       WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    );

    return { message: 'Success', code: 'RESET_PASSWORD_SUCCESS' };
  }

  static async getMe(userId: string) {
    const result = await pool.query(
      `SELECT u.id, u.tenant_id, u.branch_id, u.email, u.full_name, u.role, 
              u.onboarding_completed,
              u.notify_upcoming_sessions,
              (u.google_refresh_token IS NOT NULL) as is_google_connected,
              t.name as tenant_name,
              t.settings as tenant_settings,
              pd.code as plan_code,
              (SELECT COALESCE(json_object_agg(feature_key, is_enabled), '{}'::json) FROM plan_features WHERE plan_id = t.plan_id) as plan_features
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
       JOIN plan_definitions pd ON t.plan_id = pd.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    return result.rows[0];
  }

  static async updateMe(userId: string, data: any) {
    const { full_name, notify_upcoming_sessions } = data;

    const result = await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), notify_upcoming_sessions = COALESCE($2, notify_upcoming_sessions) 
       WHERE id = $3 RETURNING id, tenant_id, branch_id, email, full_name, role, notify_upcoming_sessions`,
      [full_name, notify_upcoming_sessions, userId]
    );

    if (result.rows.length === 0) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    return result.rows[0];
  }

  static async completeOnboarding(userId: string) {
    await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [userId]);
    return { success: true };
  }

  static async refreshToken(token: string) {
    const result = await pool.query(
      `SELECT rt.user_id, u.tenant_id, u.branch_id, u.role
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const user = result.rows[0];
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);

    const { accessToken, refreshToken: newRefreshToken } = await this.issueTokens(user);

    return { accessToken, refreshToken: newRefreshToken };
  }

  static async logout(token: string | undefined) {
    if (token) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    }
    return { success: true };
  }
}

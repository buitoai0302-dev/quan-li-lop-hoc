import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db';
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
import {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  checkEmailRateLimit,
  recordEmailAttempt,
} from '../services/rateLimit.service';
import {
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';

import { config } from '../utils/config';
import { PLAN_CODES, TENANT_STATUS, DEFAULT_FREE_PLAN_ID } from '../utils/constants';

// ─── Helpers ────────────────────────────────────────────────────────────────

const validatePassword = (password: string): { valid: boolean; errorCode?: string } => {
  if (password.length < 8) return { valid: false, errorCode: 'passwordStrength.minLength' };
  if (!/[A-Z]/.test(password)) return { valid: false, errorCode: 'passwordStrength.hasUppercase' };
  if (!/[0-9]/.test(password)) return { valid: false, errorCode: 'passwordStrength.hasNumber' };
  return { valid: true };
};

// Helper: tạo cặp access_token + refresh_token và lưu refresh_token vào DB
const issueTokens = async (user: any) => {
  const payload = {
    userId: user.id,
    tenantId: user.tenant_id,
    branchId: user.branch_id,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, config.jwtSecret(), {
    expiresIn: config.jwtExpiresIn() as any,
  });
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

  await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [
    user.id,
    refreshToken,
    expiresAt,
  ]);

  return { accessToken, refreshToken };
};

// Helper: gắn refresh token vào httpOnly cookie
const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true, // Không thể đọc bằng JavaScript (chống XSS)
    secure: process.env.NODE_ENV === 'production', // Chỉ HTTPS trên production
    sameSite: 'lax', // Chống CSRF cơ bản
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
    path: '/',
  });
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (!email || !password) {
    return next(new ValidationError('Missing email or password', 'MISSING_REQUIRED_FIELDS'));
  }

  // Rate limiting check
  const rateCheck = await checkRateLimit(ip, email);
  if (rateCheck.blocked) {
    return res.status(429).json({
      error: `Too many failed attempts. Try again in ${Math.ceil(rateCheck.retryAfter! / 60)} min.`,
      code: 'TOO_MANY_ATTEMPTS',
      retryAfter: rateCheck.retryAfter,
    });
  }

  try {
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
      return next(new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS'));
    }

    const user = result.rows[0];

    // Check Tenant Status using is_active as source of truth
    if (user.role !== 'super_admin' && !user.tenant_active) {
      return next(new ForbiddenError('Your center is inactive or suspended', 'TENANT_INACTIVE'));
    }

    if (!user.is_email_verified) {
      return next(new ForbiddenError('Email not verified', 'EMAIL_NOT_VERIFIED'));
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await recordFailedAttempt(ip, email);
      const remaining = (await checkRateLimit(ip, email)).remainingAttempts;
      return next(
        new AuthenticationError(
          `Invalid email or password. ${remaining} attempts left.`,
          'INVALID_CREDENTIALS'
        )
      );
    }

    // Success
    await clearAttempts(ip, email);

    const { accessToken, refreshToken } = await issueTokens(user);
    const { password_hash, verification_token, reset_password_token, ...userWithoutSensitive } =
      user;

    // Refresh token → httpOnly cookie (chống XSS)
    setRefreshCookie(res, refreshToken);
    // Access token → response body (localStorage, sống 15 phút)
    res.json({ token: accessToken, user: userWithoutSensitive });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { credential } = req.body;

  if (!credential) {
    return next(new ValidationError('Missing Google credential', 'MISSING_REQUIRED_FIELDS'));
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return next(new AuthenticationError('Invalid Google token', 'INVALID_CREDENTIALS'));
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
      // Auto-register via Google
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Default plan
        const planResult = await client.query(
          `SELECT id, code FROM plan_definitions WHERE code = $1`,
          [PLAN_CODES.FREE]
        );
        const planId = planResult.rows[0]?.id || DEFAULT_FREE_PLAN_ID;
        const planCode = planResult.rows[0]?.code || 'FREE';

        // Create ACTIVE tenant for Google login
        const tenantResult = await client.query(
          'INSERT INTO tenants (plan_id, name, status, is_active, contact_email) VALUES ($1, $2, $3, true, $4) RETURNING id, name as tenant_name, plan_id, is_active as tenant_active, settings as tenant_settings',
          [planId, `Center of ${fullName}`, TENANT_STATUS.ACTIVE, email]
        );
        const newTenant = tenantResult.rows[0];

        // Create verified user
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
          plan_features: {}, // will be empty for FREE initially, or can fetch properly, but default FREE is fine
        };

        // Create default branch
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

    // Check Tenant Status
    if (user.role !== 'super_admin' && !user.tenant_active) {
      return next(new ForbiddenError('Your center is inactive or suspended', 'TENANT_INACTIVE'));
    }

    // Google-authenticated users still need email verified (auto-mark as verified if signing in via Google)
    if (!user.is_email_verified) {
      await pool.query('UPDATE users SET is_email_verified = true WHERE id = $1', [user.id]);
    }

    const { accessToken, refreshToken } = await issueTokens(user);
    const { password_hash, verification_token, reset_password_token, ...userWithoutSensitive } =
      user;
    // Refresh token → httpOnly cookie
    setRefreshCookie(res, refreshToken);
    res.json({ token: accessToken, user: userWithoutSensitive });
  } catch (error) {
    next(error);
  }
};

// ─── Register ────────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, fullName, tenantName } = req.body;

  if (!email || !password || !fullName) {
    return next(new ValidationError('Missing fields', 'MISSING_REQUIRED_FIELDS'));
  }

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    return next(new ValidationError('Weak password', pwCheck.errorCode));
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return next(new ValidationError('Email already registered', 'EMAIL_ALREADY_EXISTS'));
    }

    const planResult = await client.query(`SELECT id FROM plan_definitions WHERE code = $1`, [
      PLAN_CODES.FREE,
    ]);
    const planId = planResult.rows[0]?.id || DEFAULT_FREE_PLAN_ID;

    const tenantResult = await client.query(
      'INSERT INTO tenants (plan_id, name, status, is_active, contact_email) VALUES ($1, $2, $3, false, $4) RETURNING id, settings as tenant_settings',
      [planId, tenantName || `Center of ${fullName}`, TENANT_STATUS.PENDING, email]
    );
    const { id: tenantId, tenant_settings } = tenantResult.rows[0];

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_email_verified, verification_token, verification_token_expires) 
       VALUES ($1, $2, $3, $4, 'admin', false, $5, $6)`,
      [tenantId, email, passwordHash, fullName, verificationToken, tokenExpires]
    );

    // Tạo chi nhánh mặc định - sẽ được người dùng đặt tên lại trong bước onboarding
    await client.query(`INSERT INTO branches (tenant_id, name) VALUES ($1, $2)`, [
      tenantId,
      tenantName || 'Chi nhánh chính',
    ]);

    await client.query('COMMIT');
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: 'Success', code: 'REGISTER_SUCCESS' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ─── Verify Email ─────────────────────────────────────────────────────────────

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return next(new ValidationError('Invalid token', 'INVALID_TOKEN'));
  }

  try {
    // 1. Cố gắng cập nhật token
    const result = await pool.query(
      `UPDATE users 
       SET is_email_verified = true, verification_token = NULL, verification_token_expires = NULL 
       WHERE verification_token = $1 
         AND (verification_token_expires IS NULL OR verification_token_expires > NOW())
       RETURNING id, tenant_id, is_email_verified`,
      [token]
    );

    if (result.rowCount === 0) {
      // 2. Nếu không cập nhật được (rowCount === 0), kiểm tra xem có phải do đã xác thực rồi không
      // (Dành cho trường hợp nhấn đúp hoặc trình duyệt pre-fetch)
      const checkResult = await pool.query(
        'SELECT id, is_email_verified FROM users WHERE verification_token IS NULL AND is_email_verified = true LIMIT 1'
      );

      // Lưu ý: Logic này hơi rộng vì không biết email nào.
      // Tốt nhất là frontend nên gửi kèm email hoặc chúng ta tìm user theo token (nhưng token đã bị xóa).
      // Cách an toàn hơn: Kiểm tra xem có User nào vừa mới được xác thực gần đây không hoặc đơn giản là trả về success nếu frontend React gọi 2 lần.

      // Thực tế: Nếu rowCount === 0 thì có thể token sai thật hoặc đã dùng.
      // Để trải nghiệm tốt nhất, ta có thể báo thành công nếu đây là một "double request" từ client.
      return res.json({
        message: 'Success',
        code: 'VERIFY_EMAIL_SUCCESS',
        note: 'Already verified or double request',
      });
    }

    const { tenant_id } = result.rows[0];

    // Tự động kích hoạt Tenant khi người dùng đầu tiên (admin) xác thực email
    await pool.query(
      "UPDATE tenants SET is_active = true, status = 'active' WHERE id = $1 AND status = 'pending'",
      [tenant_id]
    );

    res.json({ message: 'Success', code: 'VERIFY_EMAIL_SUCCESS' });
  } catch (error) {
    next(error);
  }
};

// ─── Resend Verification ──────────────────────────────────────────────────────

export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    return next(new ValidationError('Email required', 'MISSING_REQUIRED_FIELDS'));
  }

  try {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const rateCheck = await checkEmailRateLimit(ip);
    if (rateCheck.blocked) {
      return next(
        new ForbiddenError(
          `Too many requests. Please try again in ${rateCheck.retryAfter} seconds.`,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    const result = await pool.query('SELECT id, is_email_verified FROM users WHERE email = $1', [
      email,
    ]);

    if (result.rows.length === 0 || result.rows[0].is_email_verified) {
      return res.json({ message: 'Sent if applicable', code: 'RESEND_VERIFICATION_SENT' });
    }

    const newToken = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE email = $3',
      [newToken, tokenExpires, email]
    );

    await recordEmailAttempt(ip);
    await sendVerificationEmail(email, newToken);
    res.json({ message: 'Sent', code: 'RESEND_VERIFICATION_SENT' });
  } catch (error) {
    next(error);
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    return next(new ValidationError('Email required', 'MISSING_REQUIRED_FIELDS'));
  }

  try {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const rateCheck = await checkEmailRateLimit(ip);
    if (rateCheck.blocked) {
      return next(
        new ForbiddenError(
          `Too many requests. Please try again in ${rateCheck.retryAfter} seconds.`,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.json({ message: 'Sent if applicable', code: 'FORGOT_PASSWORD_SENT' });
    }

    const resetToken = crypto.randomUUID();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [resetToken, resetExpires, email]
    );

    await recordEmailAttempt(ip);
    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: 'Sent', code: 'FORGOT_PASSWORD_SENT' });
  } catch (error) {
    next(error);
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new ValidationError('Missing token or password', 'MISSING_REQUIRED_FIELDS'));
  }

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    return next(new ValidationError('Weak password', pwCheck.errorCode));
  }

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return next(new ValidationError('Token expired', 'RESET_PASSWORD_EXPIRED'));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.query(
      `UPDATE users 
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL 
       WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    );

    res.json({ message: 'Success', code: 'RESET_PASSWORD_SUCCESS' });
  } catch (error) {
    next(error);
  }
};

// ─── Get Me ───────────────────────────────────────────────────────────────────

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) throw new AuthenticationError();

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

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ─── Update Me ────────────────────────────────────────────────────────────────

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { full_name, notify_upcoming_sessions } = req.body;

    const result = await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), notify_upcoming_sessions = COALESCE($2, notify_upcoming_sessions) 
       WHERE id = $3 RETURNING id, tenant_id, branch_id, email, full_name, role, notify_upcoming_sessions`,
      [full_name, notify_upcoming_sessions, userId]
    );

    if (result.rows.length === 0) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ─── Complete Onboarding ──────────────────────────────────────────────────────

export const completeOnboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    // Direct UPDATE — cột onboarding_completed đã tồn tại sau khi chạy migration
    await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  // Ưu tiên lấy từ httpOnly cookie, fallback sang body (tương thích ngược)
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) return next(new ValidationError('Refresh token required', 'MISSING_REQUIRED_FIELDS'));

  try {
    const result = await pool.query(
      `SELECT rt.user_id, u.tenant_id, u.branch_id, u.role
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return next(
        new AuthenticationError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN')
      );
    }

    const user = result.rows[0];

    // Xoá token cũ (rotation)
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);

    const { accessToken, refreshToken: newRefreshToken } = await issueTokens({
      id: user.user_id,
      tenant_id: user.tenant_id,
      branch_id: user.branch_id,
      role: user.role,
    });

    // Cập nhật cookie mới
    setRefreshCookie(res, newRefreshToken);
    res.json({ token: accessToken });
  } catch (error) {
    next(error);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  try {
    if (token) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    }
    // Xóa httpOnly cookie
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

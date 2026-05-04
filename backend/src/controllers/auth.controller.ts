import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db';
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '../services/rateLimit.service';
import { ValidationError, AuthenticationError, ForbiddenError, NotFoundError } from '../utils/errors';

const getJwtSecret = () => process.env.JWT_SECRET || 'eduschedule-super-secret-jwt-key-2024-change-in-production';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

// ─── Helpers ────────────────────────────────────────────────────────────────

const validatePassword = (password: string): { valid: boolean; errorCode?: string } => {
  if (password.length < 8) return { valid: false, errorCode: 'passwordStrength.minLength' };
  if (!/[A-Z]/.test(password)) return { valid: false, errorCode: 'passwordStrength.hasUppercase' };
  if (!/[0-9]/.test(password)) return { valid: false, errorCode: 'passwordStrength.hasNumber' };
  return { valid: true };
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (!email || !password) {
    return next(new ValidationError('Missing email or password', 'MISSING_REQUIRED_FIELDS'));
  }

  // Rate limiting check
  const rateCheck = checkRateLimit(ip, email);
  if (rateCheck.blocked) {
    return res.status(429).json({
      error: `Too many failed attempts. Try again in ${Math.ceil(rateCheck.retryAfter! / 60)} min.`,
      code: 'TOO_MANY_ATTEMPTS',
      retryAfter: rateCheck.retryAfter
    });
  }

  try {
    const result = await pool.query(
      `SELECT u.*, t.name as tenant_name, t.plan_id, t.status as tenant_status 
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      recordFailedAttempt(ip, email);
      return next(new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS'));
    }

    const user = result.rows[0];

    // Check Tenant Status
    if (user.role !== 'super_admin') {
      if (user.tenant_status === 'pending') {
        return next(new ForbiddenError('Your center is pending approval', 'TENANT_PENDING'));
      }
      if (user.tenant_status === 'suspended') {
        return next(new ForbiddenError('Your center has been suspended', 'TENANT_SUSPENDED'));
      }
    }
    
    if (!user.is_email_verified) {
      return next(new ForbiddenError('Email not verified', 'EMAIL_NOT_VERIFIED'));
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      recordFailedAttempt(ip, email);
      const remaining = checkRateLimit(ip, email).remainingAttempts;
      return next(new AuthenticationError(`Invalid email or password. ${remaining} attempts left.`, 'INVALID_CREDENTIALS'));
    }

    // Success
    clearAttempts(ip, email);

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        branchId: user.branch_id,
        role: user.role,
      },
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn() as any }
    );

    const { password_hash, verification_token, reset_password_token, ...userWithoutSensitive } = user;
    res.json({ token, user: userWithoutSensitive });
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

    const result = await pool.query(
      `SELECT u.*, t.name as tenant_name, t.plan_id, t.status as tenant_status 
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return next(new AuthenticationError('Account not found. Please register first.', 'USER_NOT_FOUND'));
    }

    const user = result.rows[0];

    // Check Tenant Status
    if (user.role !== 'super_admin') {
      if (user.tenant_status === 'pending') {
        return next(new ForbiddenError('Your center is pending approval', 'TENANT_PENDING'));
      }
      if (user.tenant_status === 'suspended') {
        return next(new ForbiddenError('Your center has been suspended', 'TENANT_SUSPENDED'));
      }
    }

    // Google-authenticated users still need email verified (auto-mark as verified if signing in via Google)
    if (!user.is_email_verified) {
      await pool.query('UPDATE users SET is_email_verified = true WHERE id = $1', [user.id]);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        branchId: user.branch_id,
        role: user.role,
      },
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn() as any }
    );

    const { password_hash, verification_token, reset_password_token, ...userWithoutSensitive } = user;
    res.json({ token, user: userWithoutSensitive });
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

    const planResult = await client.query(`SELECT id FROM plan_definitions WHERE code = 'FREE'`);
    const planId = planResult.rows[0]?.id || 'ffffffff-0000-0000-0000-000000000001';

    const tenantResult = await client.query(
      "INSERT INTO tenants (plan_id, name, status, is_active) VALUES ($1, $2, 'pending', false) RETURNING id",
      [planId, tenantName || `Center of ${fullName}`]
    );
    const tenantId = tenantResult.rows[0].id;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_email_verified, verification_token, verification_token_expires) 
       VALUES ($1, $2, $3, $4, 'admin', false, $5, $6)`,
      [tenantId, email, passwordHash, fullName, verificationToken, tokenExpires]
    );

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
    const result = await pool.query(
      `UPDATE users 
       SET is_email_verified = true, verification_token = NULL, verification_token_expires = NULL 
       WHERE verification_token = $1 
         AND (verification_token_expires IS NULL OR verification_token_expires > NOW())
       RETURNING id`,
      [token]
    );

    if (result.rowCount === 0) {
      return next(new ValidationError('Token expired or invalid', 'VERIFY_EMAIL_EXPIRED'));
    }

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
    const result = await pool.query('SELECT id, is_email_verified FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0 || result.rows[0].is_email_verified) {
      return res.json({ message: 'Sent if applicable', code: 'RESEND_VERIFICATION_SENT' });
    }

    const newToken = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE email = $3',
      [newToken, tokenExpires, email]
    );

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
              u.notify_upcoming_sessions,
              (u.google_refresh_token IS NOT NULL) as is_google_connected,
              t.name as tenant_name 
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
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

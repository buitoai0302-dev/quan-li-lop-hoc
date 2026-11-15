import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import pool from '../db';
import { config } from '../utils/config';
import { ERROR_CODES, ROLES } from '../utils/constants';
import { AuthenticationError } from '../utils/errors';

const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  role: string;
  email: string;
  session_version: number;
}

async function insertSessionTokens(client: PoolClient, user: SessionUser) {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      branchId: user.branch_id,
      role: user.role,
      email: user.email,
      sessionVersion: user.session_version,
    },
    config.jwtSecret(),
    { expiresIn: config.jwtExpiresIn() as SignOptions['expiresIn'] }
  );
  const refreshToken = crypto.randomBytes(64).toString('hex');
  await client.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS)]
  );
  return { accessToken, refreshToken };
}

export async function createSessionTokens(authenticatedUser: SessionUser) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Password verification precedes this lock. Reject if a reset happened while
    // bcrypt was running; hold the user lock until token insertion commits.
    const {
      rows: [user],
    } = await client.query<SessionUser>(
      `SELECT u.id, u.tenant_id, u.branch_id, u.role, u.email, u.session_version
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1 AND u.tenant_id = $2 AND u.is_active = true
         AND (t.is_active = true OR u.role = $3)
       FOR SHARE OF u`,
      [authenticatedUser.id, authenticatedUser.tenant_id, ROLES.SUPER_ADMIN]
    );
    if (
      !user ||
      user.session_version !== authenticatedUser.session_version ||
      user.role !== authenticatedUser.role
    ) {
      throw new AuthenticationError(
        'Authentication changed; please sign in again',
        ERROR_CODES.INVALID_TOKEN
      );
    }
    const tokens = await insertSessionTokens(client, user);
    await client.query('COMMIT');
    return tokens;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rotateSessionTokens(token: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Always lock user before refresh rows, matching the password-change trigger.
    const {
      rows: [user],
    } = await client.query<SessionUser>(
      `SELECT u.id, u.tenant_id, u.branch_id, u.role, u.email, u.session_version
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.is_active = true AND (t.is_active = true OR u.role = $2)
         AND EXISTS (SELECT 1 FROM refresh_tokens rt
                     WHERE rt.user_id = u.id AND rt.token = $1 AND rt.expires_at > NOW())
       FOR UPDATE OF u`,
      [token, ROLES.SUPER_ADMIN]
    );
    if (!user)
      throw new AuthenticationError(
        'Invalid or expired refresh token',
        ERROR_CODES.INVALID_REFRESH_TOKEN
      );
    const consumed = await client.query(
      'DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW() RETURNING id',
      [token, user.id]
    );
    if (!consumed.rowCount)
      throw new AuthenticationError(
        'Invalid or expired refresh token',
        ERROR_CODES.INVALID_REFRESH_TOKEN
      );
    const tokens = await insertSessionTokens(client, user);
    await client.query('COMMIT');
    return tokens;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

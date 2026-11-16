import crypto from 'node:crypto';
import pool from '../db';
import { ERROR_CODES, ROLES } from '../utils/constants';
import { ValidationError, AuthenticationError } from '../utils/errors';
import { getAuthUrl, handleCallback } from './google.service';

export const GOOGLE_OAUTH_LIFETIME_MS = 10 * 60 * 1000;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const hashNonce = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

interface OAuthActor {
  userId: string;
  tenantId: string;
  sessionVersion?: number;
}

export async function startGoogleConnection(actor: OAuthActor) {
  const state = crypto.randomBytes(32).toString('base64url');
  const browserNonce = crypto.randomBytes(32).toString('base64url');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      rows: [user],
    } = await client.query<{ role: string }>(
      `SELECT u.role FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1 AND u.tenant_id = $2 AND u.session_version = $3
         AND u.is_active = true AND (t.is_active = true OR u.role = $4)
       FOR UPDATE OF u`,
      [actor.userId, actor.tenantId, actor.sessionVersion ?? 0, ROLES.SUPER_ADMIN]
    );
    if (!user) throw new AuthenticationError();
    // Only the latest connection attempt for this user can complete.
    await client.query(
      'DELETE FROM google_oauth_transactions WHERE user_id = $1 AND tenant_id = $2',
      [actor.userId, actor.tenantId]
    );
    await client.query(
      `INSERT INTO google_oauth_transactions
         (state_hash, browser_hash, user_id, tenant_id, session_version, code_verifier, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        hashNonce(state),
        hashNonce(browserNonce),
        actor.userId,
        actor.tenantId,
        actor.sessionVersion ?? 0,
        codeVerifier,
        new Date(Date.now() + GOOGLE_OAUTH_LIFETIME_MS),
      ]
    );
    const url = getAuthUrl(state, user.role === ROLES.SUPER_ADMIN, codeChallenge);
    await client.query('COMMIT');
    return { url, browserNonce };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function completeGoogleConnection(
  code: unknown,
  state: unknown,
  browserNonce: unknown
) {
  if (
    typeof code !== 'string' ||
    !code ||
    code.length > 4096 ||
    typeof state !== 'string' ||
    !NONCE_PATTERN.test(state) ||
    typeof browserNonce !== 'string' ||
    !NONCE_PATTERN.test(browserNonce)
  ) {
    throw new ValidationError(
      'Invalid Google connection request',
      ERROR_CODES.GOOGLE_OAUTH_INVALID_STATE
    );
  }
  // A separate table gives OAuth state its own purpose; DELETE consumes it once,
  // before exchanging a code. A signed access JWT is never accepted as state.
  const {
    rows: [transaction],
  } = await pool.query<{
    user_id: string;
    tenant_id: string;
    session_version: number;
    code_verifier: string;
  }>(
    `DELETE FROM google_oauth_transactions oauth USING users u, tenants t
     WHERE oauth.state_hash = $1 AND oauth.browser_hash = $2 AND oauth.expires_at > clock_timestamp()
       AND u.id = oauth.user_id AND u.tenant_id = oauth.tenant_id AND t.id = oauth.tenant_id
       AND u.session_version = oauth.session_version AND u.is_active = true
       AND (t.is_active = true OR u.role = $3)
     RETURNING oauth.user_id, oauth.tenant_id, oauth.session_version, oauth.code_verifier`,
    [hashNonce(state), hashNonce(browserNonce), ROLES.SUPER_ADMIN]
  );
  if (!transaction) {
    throw new ValidationError(
      'Google connection expired or already used',
      ERROR_CODES.GOOGLE_OAUTH_INVALID_STATE
    );
  }
  await handleCallback(
    code,
    transaction.user_id,
    transaction.tenant_id,
    transaction.session_version,
    transaction.code_verifier
  );
}

export async function disconnectGoogleConnection(userId: string, tenantId: string) {
  await pool.query(
    `UPDATE users SET google_access_token = NULL, google_refresh_token = NULL, google_calendar_id = NULL
     WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );
}

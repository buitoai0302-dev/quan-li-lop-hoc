import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../src/db';
import { AuthService } from '../../src/services/auth.service';
import { createSessionTokens } from '../../src/services/auth-session.service';
import { AdminService } from '../../src/services/admin.service';
import { TeacherService } from '../../src/services/teacher.service';
import {
  startGoogleConnection,
  completeGoogleConnection,
} from '../../src/services/google-oauth.service';
import { handleCallback } from '../../src/services/google.service';
import { authMiddleware } from '../../src/middlewares/auth.middleware';
import { config } from '../../src/utils/config';

jest.mock('../../src/db', () => {
  const { Pool } = jest.requireActual<typeof import('pg')>('pg');
  return {
    __esModule: true,
    default: new Pool({
      connectionString: process.env.PG_INTEGRITY_TEST_URL,
      connectionTimeoutMillis: 5000,
      application_name: 'eduschedule-auth-security-tests',
    }),
  };
});
jest.mock('../../src/utils/config', () => ({
  config: {
    jwtSecret: () => 'isolated-auth-fixture-secret-not-for-production',
    jwtExpiresIn: () => '15m',
  },
}));
jest.mock('../../src/services/email.service', () => ({
  sendPasswordResetEmail: jest.fn(async () => {}),
  sendVerificationEmail: jest.fn(async () => {}),
}));
jest.mock('../../src/services/google.service', () => ({
  getAuthUrl: (state: string, _drive: boolean, challenge: string) =>
    `https://accounts.google.com/?state=${state}&code_challenge=${challenge}`,
  handleCallback: jest.fn(async () => {}),
}));
jest.mock('../../src/services/rateLimit.service', () => ({
  checkRateLimit: jest.fn(async () => ({ blocked: false })),
  clearAttempts: jest.fn(),
  recordFailedAttempt: jest.fn(),
}));

const url = process.env.PG_INTEGRITY_TEST_URL;
const describePostgres = url ? describe : describe.skip;
const tenantIds: string[] = [];
const app = express();
app.get('/private', authMiddleware, (_req, res) => res.sendStatus(200));
let passwordHash: string;

async function fixture() {
  const suffix = randomUUID();
  const tenant = (
    await pool.query(
      "INSERT INTO tenants (name, plan_id, is_active) SELECT $1, id, true FROM plan_definitions WHERE code = 'FREE' RETURNING id",
      [`Security fixture ${suffix}`]
    )
  ).rows[0].id as string;
  tenantIds.push(tenant);
  const resetToken = randomUUID();
  const {
    rows: [user],
  } = await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_active, is_email_verified,
      reset_password_token, reset_password_expires)
     VALUES ($1, $2, $3, 'Synthetic security user', 'admin', true, true, $4, NOW() + INTERVAL '1 hour')
     RETURNING id, tenant_id, branch_id, role, email, session_version`,
    [tenant, `security-${suffix}@example.test`, passwordHash, resetToken]
  );
  return { user, resetToken, tenant };
}

async function waitForLockWaiters(count: number) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const {
      rows: [row],
    } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM pg_stat_activity
       WHERE application_name = 'eduschedule-auth-security-tests' AND wait_event_type = 'Lock'`
    );
    if (row.count >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Expected independent PostgreSQL connections to reach the user lock');
}

describePostgres('authentication security on isolated PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    const database = decodeURIComponent(target.pathname.slice(1));
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
    if (
      process.env.PG_INTEGRITY_CONFIRMATION !== 'isolated-synthetic-staging' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      !(
        database === 'eduschedule_staging' ||
        (loopback && database === 'eduschedule_integrity_test')
      ) ||
      (!loopback && target.searchParams.get('sslmode') !== 'verify-full') ||
      target.searchParams.has('options')
    ) {
      throw new Error('Refusing authentication fixtures outside confirmed isolated PostgreSQL');
    }
    expect((await pool.query('SELECT current_database() AS name')).rows[0].name).toBe(database);
    passwordHash = await bcrypt.hash('OriginalFixturePass1', 10);
  });
  afterAll(async () => {
    try {
      if (tenantIds.length)
        await pool.query('DELETE FROM tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
    } finally {
      await pool.end();
    }
  });

  it('self reset revokes old access/refresh tokens while the new password can log in', async () => {
    const { user, resetToken } = await fixture();
    const before = await createSessionTokens(user);
    expect(
      (await request(app).get('/private').set('Authorization', `Bearer ${before.accessToken}`))
        .status
    ).toBe(200);
    await AuthService.resetPassword({ token: resetToken, password: 'NewFixturePass2' });
    await expect(AuthService.refreshToken(before.refreshToken)).rejects.toMatchObject({
      errorCode: 'INVALID_REFRESH_TOKEN',
    });
    expect(
      (await request(app).get('/private').set('Authorization', `Bearer ${before.accessToken}`))
        .status
    ).toBe(401);
    const after = await AuthService.login(user.email, 'NewFixturePass2', '192.0.2.1');
    expect(jwt.verify(after.accessToken, config.jwtSecret())).toMatchObject({ sessionVersion: 1 });
    expect(
      (await request(app).get('/private').set('Authorization', `Bearer ${after.accessToken}`))
        .status
    ).toBe(200);
    await expect(
      AuthService.resetPassword({ token: resetToken, password: 'AnotherFixturePass3' })
    ).rejects.toMatchObject({ errorCode: 'RESET_PASSWORD_EXPIRED' });
  });

  it('only one of two concurrent resets consumes the token', async () => {
    const { user, resetToken } = await fixture();
    const blocker = await pool.connect();
    let outcomes: PromiseSettledResult<unknown>[];
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [user.id]);
      const pending = Promise.allSettled([
        AuthService.resetPassword({ token: resetToken, password: 'ConcurrentFixture1' }),
        AuthService.resetPassword({ token: resetToken, password: 'ConcurrentFixture2' }),
      ]);
      await waitForLockWaiters(2);
      await blocker.query('COMMIT');
      outcomes = await pending;
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
    }
    expect(outcomes!.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes!.filter((outcome) => outcome.status === 'rejected')).toEqual([
      expect.objectContaining({
        reason: expect.objectContaining({ errorCode: 'RESET_PASSWORD_EXPIRED' }),
      }),
    ]);
    expect(
      (
        await pool.query('SELECT session_version, reset_password_token FROM users WHERE id = $1', [
          user.id,
        ])
      ).rows[0]
    ).toEqual({ session_version: 1, reset_password_token: null });
  });

  it.each(['refresh-first', 'reset-first'])(
    'does not resurrect sessions during %s contention',
    async (order) => {
      const { user, resetToken } = await fixture();
      const before = await createSessionTokens(user);
      const blocker = await pool.connect();
      try {
        await blocker.query('BEGIN');
        await blocker.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [user.id]);
        const refresh = () => Promise.allSettled([AuthService.refreshToken(before.refreshToken)]);
        const reset = () =>
          Promise.allSettled([
            AuthService.resetPassword({ token: resetToken, password: 'NewFixturePass2' }),
          ]);
        const first = order === 'refresh-first' ? refresh() : reset();
        await waitForLockWaiters(1);
        const second = order === 'refresh-first' ? reset() : refresh();
        await waitForLockWaiters(2);
        await blocker.query('COMMIT');
        const [firstResult, secondResult] = await Promise.all([first, second]);
        const refreshResult = (order === 'refresh-first' ? firstResult : secondResult)[0];
        const resetResult = (order === 'refresh-first' ? secondResult : firstResult)[0];
        expect(resetResult.status).toBe('fulfilled');
        if (refreshResult.status === 'fulfilled' && 'accessToken' in refreshResult.value) {
          expect(
            (
              await request(app)
                .get('/private')
                .set('Authorization', `Bearer ${refreshResult.value.accessToken}`)
            ).status
          ).toBe(401);
        }
        expect(
          (
            await pool.query(
              'SELECT COUNT(*)::int AS count FROM refresh_tokens WHERE user_id = $1',
              [user.id]
            )
          ).rows[0].count
        ).toBe(0);
      } finally {
        await blocker.query('ROLLBACK');
        blocker.release();
      }
    }
  );

  it('rolls back password, version and refresh revocation together', async () => {
    const { user } = await fixture();
    const before = await createSessionTokens(user);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        'synthetic-new-hash',
        user.id,
      ]);
      expect(
        (
          await client.query(
            'SELECT COUNT(*)::int AS count FROM refresh_tokens WHERE user_id = $1',
            [user.id]
          )
        ).rows[0].count
      ).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    expect(
      (await request(app).get('/private').set('Authorization', `Bearer ${before.accessToken}`))
        .status
    ).toBe(200);
    await expect(AuthService.refreshToken(before.refreshToken)).resolves.toHaveProperty(
      'accessToken'
    );
  });

  it('admin and teacher resets use the same immediate revocation, with tenant isolation', async () => {
    const a = await fixture();
    const b = await fixture();
    const sessionA = await createSessionTokens(a.user);
    const sessionB = await createSessionTokens(b.user);
    const branch = (
      await pool.query(
        "INSERT INTO branches (tenant_id, name) VALUES ($1, 'Synthetic branch') RETURNING id",
        [b.tenant]
      )
    ).rows[0].id;
    const teacher = (
      await pool.query(
        "INSERT INTO teachers (tenant_id, branch_id, email, full_name) VALUES ($1, $2, $3, 'Synthetic teacher') RETURNING id",
        [b.tenant, branch, b.user.email]
      )
    ).rows[0].id;
    await expect(TeacherService.resetPassword(a.tenant, teacher)).rejects.toMatchObject({
      errorCode: 'TEACHER_NOT_FOUND',
    });
    expect(
      (await request(app).get('/private').set('Authorization', `Bearer ${sessionB.accessToken}`))
        .status
    ).toBe(200);
    await AdminService.resetUserPassword(a.user.id, {});
    await TeacherService.resetPassword(b.tenant, teacher);
    for (const session of [sessionA, sessionB]) {
      expect(
        (await request(app).get('/private').set('Authorization', `Bearer ${session.accessToken}`))
          .status
      ).toBe(401);
      await expect(AuthService.refreshToken(session.refreshToken)).rejects.toMatchObject({
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
    }
  });

  it('rejects stale login snapshots and cross-tenant OAuth starts', async () => {
    const a = await fixture();
    const b = await fixture();
    await AuthService.resetPassword({ token: a.resetToken, password: 'NewFixturePass2' });
    await expect(createSessionTokens(a.user)).rejects.toMatchObject({ errorCode: 'INVALID_TOKEN' });
    await expect(
      startGoogleConnection({ userId: a.user.id, tenantId: b.tenant, sessionVersion: 1 })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('OAuth requires the originating browser and consumes state once under concurrent callbacks', async () => {
    const { user } = await fixture();
    const attempt = await startGoogleConnection({
      userId: user.id,
      tenantId: user.tenant_id,
      sessionVersion: 0,
    });
    const state = new URL(attempt.url).searchParams.get('state');
    await expect(completeGoogleConnection('code', state, 'A'.repeat(43))).rejects.toMatchObject({
      errorCode: 'GOOGLE_OAUTH_INVALID_STATE',
    });
    const outcomes = await Promise.allSettled([
      completeGoogleConnection('code', state, attempt.browserNonce),
      completeGoogleConnection('other-code', state, attempt.browserNonce),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    expect(handleCallback).toHaveBeenCalledWith(
      expect.any(String),
      user.id,
      user.tenant_id,
      0,
      expect.any(String)
    );
  });

  it.each(['expired', 'reset'])('rejects an OAuth transaction after it is %s', async (reason) => {
    const { user, resetToken } = await fixture();
    const attempt = await startGoogleConnection({
      userId: user.id,
      tenantId: user.tenant_id,
      sessionVersion: 0,
    });
    if (reason === 'expired') {
      await pool.query(
        "UPDATE google_oauth_transactions SET expires_at = NOW() - INTERVAL '1 second' WHERE user_id = $1",
        [user.id]
      );
    } else await AuthService.resetPassword({ token: resetToken, password: 'NewFixturePass2' });
    await expect(
      completeGoogleConnection(
        'code',
        new URL(attempt.url).searchParams.get('state'),
        attempt.browserNonce
      )
    ).rejects.toMatchObject({ errorCode: 'GOOGLE_OAUTH_INVALID_STATE' });
  });
});

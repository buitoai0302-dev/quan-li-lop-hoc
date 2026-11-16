import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pool from '../../src/db';
import { AuthService } from '../../src/services/auth.service';
import { createSessionTokens, rotateSessionTokens } from '../../src/services/auth-session.service';
import type { AuthUser } from '../../src/services/auth-user';
import { checkRateLimit } from '../../src/services/rateLimit.service';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('../../src/services/email.service', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
jest.mock('../../src/services/rateLimit.service', () => ({
  checkRateLimit: jest.fn(async () => ({ blocked: false })),
  clearAttempts: jest.fn(),
  recordFailedAttempt: jest.fn(),
}));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn();
  return { OAuth2Client: jest.fn(() => ({ verifyIdToken })), verifyIdToken };
});

const user: AuthUser = {
  id: 'fixture-user',
  tenant_id: 'fixture-tenant',
  branch_id: null,
  email: 'user@example.test',
  full_name: 'Fixture User',
  role: 'admin',
  session_version: 2,
  password_hash: 'fixture-hash',
  is_active: true,
  is_email_verified: true,
  onboarding_completed: true,
  notify_upcoming_sessions: true,
  is_google_connected: true,
  tenant_name: 'Fixture Center',
  tenant_settings: { menu: {} },
  tenant_active: true,
  plan_id: 'free-plan',
  plan_code: 'FREE',
  plan_features: {},
};
const query = jest.fn();
const release = jest.fn();
const originalSecret = process.env.JWT_SECRET;
const secret = crypto.randomBytes(32).toString('hex');

beforeEach(() => {
  process.env.JWT_SECRET = secret;
  (pool.connect as jest.Mock).mockResolvedValue({ query, release });
  query.mockImplementation(async (sql: string) => ({
    rows: sql.includes('SELECT u.id') ? [user] : [],
    rowCount: 1,
  }));
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  (bcrypt.hash as jest.Mock).mockResolvedValue('new-fixture-hash');
  (checkRateLimit as jest.Mock).mockResolvedValue({ blocked: false });
});
afterAll(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

it.each(['password', 'google'])('%s login returns only public user fields', async (kind) => {
  (pool.query as jest.Mock).mockResolvedValue({
    rows: [
      {
        ...user,
        google_access_token: 'synthetic-access',
        google_refresh_token: 'synthetic-refresh',
        verification_token: 'synthetic-verification',
        reset_password_token: 'synthetic-reset',
        future_secret_column: 'must-never-be-exposed',
      },
    ],
  });
  jest
    .requireMock('google-auth-library')
    .verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: user.email, email_verified: true }),
    });
  const result =
    kind === 'password'
      ? await AuthService.login(user.email, 'FixturePass1', '192.0.2.1')
      : await AuthService.googleLogin('synthetic-id-token');
  expect(result.user).toMatchObject({
    id: user.id,
    tenant_id: user.tenant_id,
    is_google_connected: true,
    full_name: user.full_name,
  });
  for (const key of [
    'password_hash',
    'google_access_token',
    'google_refresh_token',
    'verification_token',
    'reset_password_token',
    'session_version',
    'future_secret_column',
  ])
    expect(result.user).not.toHaveProperty(key);
  expect(jwt.verify(result.accessToken, secret)).toMatchObject({
    userId: user.id,
    sessionVersion: 2,
  });
  expect(query.mock.calls[query.mock.calls.length - 1]?.[0]).toBe('COMMIT');
});

it('rejects credentials checked before a simultaneous password reset', async () => {
  await expect(createSessionTokens({ ...user, session_version: 1 })).rejects.toMatchObject({
    errorCode: 'INVALID_TOKEN',
  });
  expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO refresh_tokens'))).toBe(
    false
  );
  expect(query.mock.calls[query.mock.calls.length - 1]?.[0]).toBe('ROLLBACK');
});

it('consumes a reset token in a transaction before reporting success', async () => {
  const result = await AuthService.resetPassword({
    token: 'synthetic-reset',
    password: 'FixturePass1',
  });
  expect(result.code).toBe('RESET_PASSWORD_SUCCESS');
  expect(query.mock.calls[0]?.[0]).toBe('BEGIN');
  expect(query.mock.calls[1]).toEqual([
    expect.stringContaining(
      'WHERE reset_password_token = $2 AND reset_password_expires > clock_timestamp()'
    ),
    ['new-fixture-hash', 'synthetic-reset'],
  ]);
  expect(query.mock.calls[query.mock.calls.length - 1]?.[0]).toBe('COMMIT');
  expect(release).toHaveBeenCalledTimes(1);
});

it('rejects an expired or already consumed reset token without committing', async () => {
  query.mockResolvedValue({ rows: [], rowCount: 0 });
  await expect(
    AuthService.resetPassword({ token: 'used-token', password: 'FixturePass1' })
  ).rejects.toMatchObject({ errorCode: 'RESET_PASSWORD_EXPIRED', statusCode: 400 });
  expect(query.mock.calls[query.mock.calls.length - 1]?.[0]).toBe('ROLLBACK');
});

it('does not rotate a refresh token already removed while waiting for the user lock', async () => {
  query.mockImplementation(async (sql: string) => ({
    rows: sql.includes('SELECT u.id') ? [user] : [],
    rowCount: 0,
  }));
  await expect(rotateSessionTokens('old-token')).rejects.toMatchObject({
    errorCode: 'INVALID_REFRESH_TOKEN',
  });
  expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO refresh_tokens'))).toBe(
    false
  );
  expect(query.mock.calls[query.mock.calls.length - 1]?.[0]).toBe('ROLLBACK');
});

it('rolls back refresh consumption when replacement token insertion fails', async () => {
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('INSERT INTO refresh_tokens')) throw new Error('fixture DB unavailable');
    return { rows: sql.includes('SELECT u.id') ? [user] : [], rowCount: 1 };
  });
  await expect(rotateSessionTokens('old-token')).rejects.toThrow('fixture DB unavailable');
  expect(query.mock.calls[query.mock.calls.length - 1]?.[0]).toBe('ROLLBACK');
  expect(release).toHaveBeenCalledTimes(1);
});

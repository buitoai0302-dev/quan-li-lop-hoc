import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import pool from '../../src/db';
import {
  startGoogleConnection,
  completeGoogleConnection,
} from '../../src/services/google-oauth.service';
import { getAuthUrl, handleCallback } from '../../src/services/google.service';
import { googleAuthUrl, googleCallback } from '../../src/controllers/google.controller';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';
import { logger } from '../../src/utils/logger';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('../../src/services/google.service', () => ({
  getAuthUrl: jest.fn(),
  handleCallback: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../src/utils/config', () => ({
  config: { frontendUrl: () => 'https://frontend.example.test' },
}));

const query = jest.fn();
const actor = { userId: 'user-a', tenantId: 'tenant-a', sessionVersion: 3 };
const state = crypto.randomBytes(32).toString('base64url');
const browserNonce = crypto.randomBytes(32).toString('base64url');
const transaction = {
  user_id: actor.userId,
  tenant_id: actor.tenantId,
  session_version: 3,
  code_verifier: 'fixture-verifier',
};
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const app = express();
app.use(cookieParser());
app.get(
  '/api/google/url',
  (req: AuthRequest, _res, next) => {
    req.user = { ...actor, email: 'user@example.test', role: 'admin', branchId: null };
    // Tenant impersonation must not bind the actor's Google account to another tenant.
    req.tenantId = 'different-tenant';
    next();
  },
  googleAuthUrl
);
app.get('/api/google/callback', googleCallback);
app.use(errorMiddleware);

beforeEach(() => {
  (pool.connect as jest.Mock).mockResolvedValue({ query, release: jest.fn() });
  query.mockImplementation(async (sql: string) => ({
    rows: sql.startsWith('SELECT') ? [{ role: 'admin' }] : [],
    rowCount: 1,
  }));
  (getAuthUrl as jest.Mock).mockImplementation(
    (nonce, _drive, challenge) =>
      `https://accounts.google.com/o/oauth2/v2/auth?state=${nonce}&code_challenge=${challenge}`
  );
  (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
});

it('stores only hashed browser/state nonces and sends PKCE with the current user scope', async () => {
  const result = await startGoogleConnection(actor);
  const url = new URL(result.url);
  const inserted = query.mock.calls.find(([sql]) =>
    String(sql).includes('INSERT INTO google_oauth_transactions')
  )?.[1];
  expect(inserted.slice(0, 5)).toEqual([
    hash(url.searchParams.get('state')!),
    hash(result.browserNonce),
    actor.userId,
    actor.tenantId,
    3,
  ]);
  expect(url.searchParams.get('code_challenge')).toBe(
    crypto.createHash('sha256').update(inserted[5]).digest('base64url')
  );
  expect(query.mock.calls[1][1]).toEqual([actor.userId, actor.tenantId, 3, 'super_admin']);
});

it.each([undefined, '', 'wrong-browser', []])(
  'rejects an invalid browser binding (%s) before token exchange',
  async (binding) => {
    await expect(completeGoogleConnection('code', state, binding)).rejects.toMatchObject({
      errorCode: 'GOOGLE_OAUTH_INVALID_STATE',
    });
    expect(pool.query).not.toHaveBeenCalled();
    expect(handleCallback).not.toHaveBeenCalled();
  }
);

it.each(['header.payload.signature', undefined, [state]])(
  'rejects a non-OAuth state (%s)',
  async (invalidState) => {
    await expect(
      completeGoogleConnection('code', invalidState, browserNonce)
    ).rejects.toMatchObject({ errorCode: 'GOOGLE_OAUTH_INVALID_STATE' });
    expect(handleCallback).not.toHaveBeenCalled();
  }
);

it('rejects expired, mismatched or consumed transactions without contacting Google', async () => {
  await expect(completeGoogleConnection('code', state, browserNonce)).rejects.toMatchObject({
    errorCode: 'GOOGLE_OAUTH_INVALID_STATE',
  });
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('oauth.browser_hash = $2'), [
    hash(state),
    hash(browserNonce),
    'super_admin',
  ]);
  expect(handleCallback).not.toHaveBeenCalled();
});

it('consumes the transaction once and passes its verifier and user scope to Google', async () => {
  (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [transaction] });
  await completeGoogleConnection('code', state, browserNonce);
  expect(handleCallback).toHaveBeenCalledWith(
    'code',
    actor.userId,
    actor.tenantId,
    3,
    'fixture-verifier'
  );
  await expect(completeGoogleConnection('other-code', state, browserNonce)).rejects.toMatchObject({
    errorCode: 'GOOGLE_OAUTH_INVALID_STATE',
  });
  expect(handleCallback).toHaveBeenCalledTimes(1);
});

it('sets a scoped HTTP-only cookie for cross-origin production and does not expose its nonce in JSON', async () => {
  const original = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const response = await request(app).get('/api/google/url');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual(['url']);
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(response.headers['set-cookie'][0]).toMatch(/Secure/);
    expect(response.headers['set-cookie'][0]).toMatch(/SameSite=None/);
    expect(response.headers['set-cookie'][0]).toMatch(/Path=\/api\/google/);
    expect(query.mock.calls[1][1][1]).toBe(actor.tenantId);
  } finally {
    process.env.NODE_ENV = original;
  }
});

it('uses safe translated error codes and never logs provider secrets', async () => {
  (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [transaction] });
  (handleCallback as jest.Mock).mockRejectedValue(new Error('synthetic-provider-secret'));
  const response = await request(app)
    .get('/api/google/callback')
    .query({ code: 'code', state })
    .set('Cookie', `eduschedule_google_oauth=${browserNonce}`);
  expect(response.status).toBe(302);
  expect(response.headers.location).toBe(
    'https://frontend.example.test/settings?google_sync=error&code=GOOGLE_CONNECTION_FAILED'
  );
  expect(response.headers['referrer-policy']).toBe('no-referrer');
  expect(JSON.stringify((logger.warn as jest.Mock).mock.calls)).not.toContain(
    'synthetic-provider-secret'
  );
});

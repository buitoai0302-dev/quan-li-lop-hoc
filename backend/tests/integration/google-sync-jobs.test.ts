import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pinoHttp from 'pino-http';
import pool from '../../src/db';
import googleRoutes from '../../src/routes/google.routes';
import { GoogleSyncService } from '../../src/services/google-sync.service';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import { logger } from '../../src/utils/logger';
import { NotFoundError } from '../../src/utils/errors';
import { ERROR_CODES } from '../../src/utils/constants';

jest.mock('../../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock('../../src/services/google-sync.service');
jest.mock('../../src/services/google-oauth.service');
jest.mock('../../src/services/google.service', () => ({
  syncAllSessionsToGoogle: (userId: string, tenantId: string) =>
    GoogleSyncService.createJob(tenantId, userId),
}));

const tenantId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const jobId = '33333333-3333-4333-8333-333333333333';
const JWT_SECRET = 'synthetic-google-sync-contract-tests';
const app = express();
app.use(express.json());
app.use(pinoHttp({ logger, autoLogging: false }));
app.use('/google', googleRoutes);
app.use(errorMiddleware);

function token(role = 'admin') {
  jest
    .mocked(pool.query)
    .mockResolvedValue({
      rows: [{ user_active: true, tenant_active: true, role, session_version: 0 }],
    } as never);
  return jwt.sign(
    { userId, tenantId, email: 'qa@example.test', role, sessionVersion: 0 },
    JWT_SECRET
  );
}

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

it('uses the personal authenticated tenant even while impersonating another center', async () => {
  jest.mocked(GoogleSyncService.createJob).mockResolvedValue({ id: jobId });
  const res = await request(app)
    .post('/google/sync-jobs')
    .set('Authorization', `Bearer ${token('super_admin')}`)
    .set('x-tenant-id', jobId)
    .send({ requestId: jobId, tenantId: jobId, userId: jobId });
  expect(res.status).toBe(202);
  expect(res.body).toEqual({ id: jobId });
  expect(GoogleSyncService.createJob).toHaveBeenCalledWith(tenantId, userId, jobId);
});

it('requires authentication, rejects API reader and validates requests before service access', async () => {
  expect((await request(app).post('/google/sync-jobs').send({})).status).toBe(401);
  expect(
    (
      await request(app)
        .post('/google/sync-jobs')
        .set('Authorization', `Bearer ${token('api_reader')}`)
        .send({})
    ).status
  ).toBe(403);
  const authorization = `Bearer ${token()}`;
  expect(
    (
      await request(app)
        .post('/google/sync-jobs')
        .set('Authorization', authorization)
        .send({ requestId: 'bad' })
    ).status
  ).toBe(400);
  expect(
    (
      await request(app)
        .post(`/google/sync-jobs/${jobId}/retry`)
        .set('Authorization', authorization)
        .send({ confirmLegacy: 'yes' })
    ).status
  ).toBe(400);
  expect(
    (await request(app).get('/google/sync-jobs/not-uuid').set('Authorization', authorization))
      .status
  ).toBe(400);
  expect(GoogleSyncService.createJob).not.toHaveBeenCalled();
  expect(GoogleSyncService.retry).not.toHaveBeenCalled();
  expect(GoogleSyncService.progress).not.toHaveBeenCalled();
});

it.each(['admin', 'staff', 'teacher', 'student'])(
  'permits personal jobs for %s and preserves queued semantics on the legacy endpoint',
  async (role) => {
    jest.mocked(GoogleSyncService.createJob).mockResolvedValue({ id: jobId });
    jest
      .mocked(GoogleSyncService.progress)
      .mockResolvedValue({ id: jobId, paused: true, total: 2, counts: { pending: 2 }, items: [] });
    const authorization = `Bearer ${token(role)}`;
    expect(
      (await request(app).post('/google/sync-jobs').set('Authorization', authorization).send({}))
        .status
    ).toBe(202);
    const legacy = await request(app)
      .post('/google/sync-all')
      .set('Authorization', authorization)
      .send({});
    expect(legacy.status).toBe(202);
    expect(legacy.body).toMatchObject({ count: 0, queuedCount: 2, jobId });
    expect(GoogleSyncService.createJob).toHaveBeenCalledWith(tenantId, userId);
  }
);

it('keeps progress/retry owner-scoped and passes explicit legacy confirmation only', async () => {
  const authorization = `Bearer ${token()}`;
  jest.mocked(GoogleSyncService.retry).mockResolvedValue({ id: null });
  expect(
    (
      await request(app)
        .post('/google/sync-jobs/retry')
        .set('Authorization', authorization)
        .send({ confirmLegacy: true })
    ).status
  ).toBe(202);
  expect(GoogleSyncService.retry).toHaveBeenCalledWith(tenantId, userId, undefined, true);
  jest
    .mocked(GoogleSyncService.progress)
    .mockRejectedValue(new NotFoundError('Sync job not found', ERROR_CODES.NOT_FOUND));
  const res = await request(app)
    .get(`/google/sync-jobs/${jobId}`)
    .set('Authorization', authorization);
  expect(res.status).toBe(404);
  expect(res.body.code).toBe(ERROR_CODES.NOT_FOUND);
  expect(GoogleSyncService.progress).toHaveBeenCalledWith(tenantId, userId, jobId);
});

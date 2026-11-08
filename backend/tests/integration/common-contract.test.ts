import express from 'express';
import request from 'supertest';
import { requireRole, AuthRequest } from '../../src/middlewares/auth.middleware';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import { tenantMiddleware } from '../../src/middlewares/tenant.middleware';
import { ValidationError, TooManyRequestsError } from '../../src/utils/errors';
import { ACCESS } from '../../src/utils/permissions';
import { API_PRINCIPALS, ROLES, ERROR_CODES } from '../../src/utils/constants';
import { getFreePlanId } from '../../src/utils/plans';
import type { PoolClient } from 'pg';

const app = express();
app.use((req, _res, next) => {
  (req as AuthRequest).user = {
    userId: 'test', tenantId: 'tenant', branchId: null,
    role: req.header('x-test-role') || '', email: 'test@example.com',
  };
  next();
});
app.get('/classes', requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT_API), (_req, res) => res.sendStatus(204));
app.post('/classes', requireRole(ACCESS.ADMIN_STAFF), (_req, res) => res.sendStatus(204));
app.get('/validation-error', (_req, _res, next) =>
  next(new ValidationError('Invalid identifier', ERROR_CODES.INVALID_ID_FORMAT, { field: 'classId' }))
);
app.get('/rate-error', (_req, _res, next) =>
  next(new TooManyRequestsError('Try later', ERROR_CODES.TOO_MANY_ATTEMPTS, { minutes: 3 }))
);
app.use(errorMiddleware);

describe('shared route policies and error contract', () => {
  it.each([ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER, ROLES.STUDENT, API_PRINCIPALS.READER, ROLES.SUPER_ADMIN])(
    'allows %s to read the class list', async role => {
      expect((await request(app).get('/classes').set('x-test-role', role)).status).toBe(204);
    }
  );

  it.each([ROLES.TEACHER, ROLES.STUDENT, API_PRINCIPALS.READER])(
    'does not allow %s to write classes', async role => {
      expect((await request(app).post('/classes').set('x-test-role', role)).status).toBe(403);
    }
  );

  it('keeps super admin override for write routes', async () => {
    expect((await request(app).post('/classes').set('x-test-role', ROLES.SUPER_ADMIN)).status).toBe(204);
  });

  it('ignores a raw tenant header and accepts a tenant resolved by auth', async () => {
    const scoped = express();
    const authenticatedTenant = '11111111-1111-4111-8111-111111111111';
    const foreignTenant = '22222222-2222-4222-8222-222222222222';
    scoped.get('/raw', tenantMiddleware, (_req, res) => res.sendStatus(204));
    scoped.get('/auth', (req: AuthRequest, _res, next) => {
      req.tenantId = authenticatedTenant;
      next();
    }, tenantMiddleware, (req, res) => res.json(req.tenant));

    await request(scoped).get('/raw').set('x-tenant-id', foreignTenant).expect(401);
    await request(scoped).get('/auth').set('x-tenant-id', foreignTenant)
      .expect(200, { id: authenticatedTenant });
  });

  it('returns code and safe translation params with the legacy message fields', async () => {
    const response = await request(app).get('/validation-error');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: ERROR_CODES.INVALID_ID_FORMAT,
      params: { field: 'classId' },
      message: 'Invalid identifier',
      error: 'Invalid identifier',
    });
  });

  it('returns HTTP 429 and retry time for a rate limit error', async () => {
    const response = await request(app).get('/rate-error');
    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({ code: ERROR_CODES.TOO_MANY_ATTEMPTS, params: { minutes: 3 } });
  });

  it('uses the database FREE plan and fails clearly when it is absent', async () => {
    const client = { query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'free-plan-id' }] }) } as unknown as PoolClient;
    await expect(getFreePlanId(client)).resolves.toBe('free-plan-id');
    expect(client.query).toHaveBeenCalledWith('SELECT id FROM plan_definitions WHERE code = $1', ['FREE']);
    (client.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    await expect(getFreePlanId(client)).rejects.toThrow('FREE plan is missing');
  });
});

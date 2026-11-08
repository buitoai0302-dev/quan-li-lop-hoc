import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../src/db';
import { authMiddleware } from '../../src/middlewares/auth.middleware';

jest.mock('../../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));

const app = express();
app.get('/private', authMiddleware, (_req, res) => res.sendStatus(200));

describe('Session revocation', () => {
  const originalSecret = process.env.JWT_SECRET;
  const secret = 'local-test-secret-for-session-revocation';
  const token = jwt.sign({
    userId: 'user-a', tenantId: 'tenant-a', role: 'admin', email: 'a@example.test',
  }, secret);

  beforeEach(() => { process.env.JWT_SECRET = secret; });
  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it('rejects an existing JWT after the user is disabled', async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [{ user_active: false, tenant_active: true, role: 'admin' }],
    });
    expect((await request(app).get('/private').set('Authorization', `Bearer ${token}`)).status)
      .toBe(401);
  });

  it('rejects an old admin JWT after the user role changes', async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [{ user_active: true, tenant_active: true, role: 'student' }],
    });
    expect((await request(app).get('/private').set('Authorization', `Bearer ${token}`)).status)
      .toBe(401);
  });
});

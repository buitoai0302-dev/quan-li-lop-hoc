import request from 'supertest';
import express from 'express';
import { apiKeyMiddleware } from '../../src/middlewares/api.middleware';
import { authMiddleware, requireRole } from '../../src/middlewares/auth.middleware';
import { tenantMiddleware } from '../../src/middlewares/tenant.middleware';
import pool from '../../src/db';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const app = express();
const protectedRoutes = express.Router();
protectedRoutes.use(apiKeyMiddleware, authMiddleware, tenantMiddleware);
protectedRoutes.get('/classes', requireRole(['api_reader']), (req, res) =>
  res.json({ tenantId: (req as any).tenantId })
);
protectedRoutes.post('/classes', requireRole(['admin']), (_req, res) => res.sendStatus(201));
app.use('/api', protectedRoutes);

describe('API key scope', () => {
  beforeEach(() => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Pilot center' }],
    });
  });
  it('allows a key alone to read its tenant endpoint', async () => {
    const response = await request(app).get('/api/classes').set('x-api-key', 'test-key');
    expect(response.status).toBe(200);
    expect(response.body.tenantId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('does not allow the same key to write', async () => {
    const response = await request(app).post('/api/classes').set('x-api-key', 'test-key');
    expect(response.status).toBe(403);
  });
});

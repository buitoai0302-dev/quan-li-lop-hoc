import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth.routes';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import pinoHttp from 'pino-http';
import { logger } from '../../src/utils/logger';

// Create a standalone express app for testing auth routes
const app = express();
app.use(express.json());
app.use(pinoHttp({ logger, autoLogging: false })); // disable logging for tests
app.use('/api/auth', authRoutes);
app.use(errorMiddleware);

describe('Auth Integration Tests', () => {
  it('should return 400 for invalid login payload', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid-email', // invalid email
        password: '', // too short
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unsupported signup billing cycle before writing data', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'new@example.test', password: 'ValidPass1', fullName: 'New Admin',
      tenantName: 'Sample Center', intendedPlanCode: 'PRO', billingCycle: 'WEEKLY',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('requires a nonblank center name when one is supplied', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'new@example.test', password: 'ValidPass1', fullName: 'New Admin', tenantName: '   ',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  // We mock pool for actual db queries or run against a test DB
  // This is a basic test demonstrating supertest + zod validation
});

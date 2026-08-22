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
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details).toHaveProperty('email');
    expect(res.body.details).toHaveProperty('password');
  });

  // We mock pool for actual db queries or run against a test DB
  // This is a basic test demonstrating supertest + zod validation
});

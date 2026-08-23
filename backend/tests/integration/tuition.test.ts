import { jest, describe, it, expect, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import pinoHttp from 'pino-http';
import tuitionRoutes from '../../src/routes/tuition.routes';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import { logger } from '../../src/utils/logger';
import { TuitionService } from '../../src/services/tuition.service';

// Mock the TuitionService so we don't hit the real DB
jest.mock('../../src/services/tuition.service');

// Mock auth & tenant middlewares to bypass authentication
jest.mock('../../src/middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-id', tenantId: 'test-tenant-id', role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

jest.mock('../../src/middlewares/tenant.middleware', () => ({
  tenantMiddleware: (req: any, res: any, next: any) => {
    req.tenantId = 'test-tenant-id';
    next();
  },
}));

// Setup app
const app = express();
app.use(express.json());
app.use(pinoHttp({ logger, autoLogging: false }));

// IMPORTANT: Register mock middlewares manually if needed, 
// but since they are imported in tuition.routes, the mock will apply.
app.use('/api/tuitions', tuitionRoutes);
app.use(errorMiddleware);

describe('Tuition Integration Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tuitions', () => {
    it('should return 200 and a list of tuitions', async () => {
      const mockData = [
        { id: '1', title: 'Tuition 1', amount: 1000 },
      ];
      (TuitionService.getTuitions as jest.Mock<any>).mockResolvedValue(mockData);

      const res = await request(app).get('/api/tuitions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockData);
      expect(TuitionService.getTuitions).toHaveBeenCalledWith('test-tenant-id', expect.any(Object));
    });
  });

  describe('POST /api/tuitions', () => {
    it('should create a tuition and return 201', async () => {
      const mockResponse = { id: '2', title: 'New Tuition' };
      (TuitionService.createTuition as jest.Mock<any>).mockResolvedValue(mockResponse);

      const res = await request(app)
        .post('/api/tuitions')
        .send({
          class_id: 'class-1',
          student_id: 'student-1',
          title: 'New Tuition',
          amount: 500000,
          due_date: '2023-12-31'
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockResponse);
      expect(TuitionService.createTuition).toHaveBeenCalledWith(
        'test-tenant-id',
        'test-user-id',
        expect.objectContaining({ title: 'New Tuition' })
      );
    });

    it('should return 400 validation error if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/tuitions')
        .send({
          title: 'Missing other fields'
        });

      // Assuming zod validation is in place on the route
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });
});

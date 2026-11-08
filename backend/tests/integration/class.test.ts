import request from 'supertest';
import express from 'express';
import pinoHttp from 'pino-http';
import classRoutes from '../../src/routes/class.routes';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import { logger } from '../../src/utils/logger';
import { ClassService } from '../../src/services/class.service';
import { ScheduleConflictError, scheduleWriteError } from '../../src/utils/errors';

jest.mock('../../src/services/class.service');
jest.mock('../../src/middlewares/feature.middleware', () => ({
  enforceLimit: () => (_req: any, _res: any, next: any) => next(),
}));

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

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger, autoLogging: false }));
app.use((req: any, _res, next) => {
  req.user = { userId: 'test-user-id', tenantId: 'test-tenant-id', role: 'admin', email: 'admin@example.test' };
  next();
});

app.use('/api/classes', classRoutes);
app.use(errorMiddleware);

describe('Class Integration Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/classes', () => {
    it('should return 200 and a list of classes', async () => {
      const mockData = [
        { id: '1', name: 'Class 1', status: 'active' },
      ];
      (ClassService.getClasses as jest.Mock<any>).mockResolvedValue(mockData);

      const res = await request(app).get('/api/classes');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockData);
      expect(ClassService.getClasses).toHaveBeenCalledWith('test-tenant-id', 'admin', 'admin@example.test');
    });
  });

  describe('POST /api/classes', () => {
    it('returns the blocked recurring slot in the existing schedule conflict format', async () => {
      const slot = { date: '2030-04-01', startTime: '08:00', endTime: '09:00' };
      const dbError = { code: '23P01', constraint: 'schedule_sessions_room_overlap' };
      const conflict = scheduleWriteError(dbError, slot);
      expect(conflict).toBeInstanceOf(ScheduleConflictError);
      expect(scheduleWriteError({ code: '23P01', constraint: 'other' })).not.toBeInstanceOf(ScheduleConflictError);
      jest.mocked(ClassService.createClass).mockRejectedValue(conflict);
      const recurring = [{
        day_of_week: '1', start_time: '08:00', end_time: '09:00',
        room_id: '11111111-1111-4111-8111-111111111111',
      }];

      const response = await request(app).post('/api/classes').send({
        name: 'Recurring class', branch_id: recurring[0].room_id, recurring_schedules: recurring,
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false, error: 'SCHEDULE_CONFLICT', conflicts: [{ conflict_type: 'ROOM_CONFLICT' }], slot,
      });
      expect(ClassService.createClass).toHaveBeenCalledWith(
        'test-tenant-id', expect.objectContaining({ recurring_schedules: recurring })
      );
    });
    it('should return 400 validation error if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/classes')
        .send({
          // Missing name, course_id, branch_id
        });

      // Zod validation should block it
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should create a class and return 201', async () => {
      const mockResponse = { id: '2', name: 'New Class' };
      (ClassService.createClass as jest.Mock<any>).mockResolvedValue(mockResponse);

      const res = await request(app)
        .post('/api/classes')
        .send({
          name: 'New Class',
          branch_id: '11111111-1111-4111-8111-111111111111',
          start_date: '2023-01-01'
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockResponse);
      expect(ClassService.createClass).toHaveBeenCalledWith(
        'test-tenant-id',
        expect.objectContaining({ name: 'New Class' })
      );
    });
  });
});

import request from 'supertest';
import express from 'express';
import pinoHttp from 'pino-http';
import scheduleRoutes from '../../src/routes/schedule.routes';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import { logger } from '../../src/utils/logger';
import { ScheduleService } from '../../src/services/schedule.service';

jest.mock('../../src/services/schedule.service');

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

app.use('/api/schedule', scheduleRoutes);
app.use(errorMiddleware);

describe('Schedule Integration Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/schedule/sessions', () => {
    it('should return 200 and a list of sessions', async () => {
      const mockData = [
        { id: '1', title: 'Session 1' },
      ];
      (ScheduleService.getWeeklySchedule as jest.Mock<any>).mockResolvedValue(mockData);

      const res = await request(app).get('/api/schedule/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockData);
      expect(ScheduleService.getWeeklySchedule).toHaveBeenCalledWith('test-tenant-id', expect.any(Object), 'admin', undefined);
    });
  });

  describe('POST /api/schedule/sessions', () => {
    it('should create a session and return 201', async () => {
      const mockResponse = { id: '2', title: 'New Session' };
      (ScheduleService.createSession as jest.Mock<any>).mockResolvedValue(mockResponse);

      const res = await request(app)
        .post('/api/schedule/sessions')
        .send({
          title: 'New Session',
          class_id: 'class-1',
          teacher_id: 'teacher-1',
          room_id: 'room-1',
          start_time: '2023-01-01T10:00:00Z',
          end_time: '2023-01-01T11:00:00Z'
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockResponse);
      expect(ScheduleService.createSession).toHaveBeenCalledWith(
        'test-tenant-id',
        expect.objectContaining({ title: 'New Session' }),
        false // default allowConflict = false
      );
    });

    it('should return conflict error if conflict exists', async () => {
      (ScheduleService.createSession as jest.Mock<any>).mockRejectedValue({
        status: 409,
        error: 'CONFLICT',
        message: 'Conflict detected',
        conflicts: [{ id: 'conflict-1' }]
      });

      const res = await request(app)
        .post('/api/schedule/sessions')
        .send({
          title: 'Conflict Session',
          class_id: 'class-1',
          teacher_id: 'teacher-1',
          room_id: 'room-1',
          start_time: '2023-01-01T10:00:00Z',
          end_time: '2023-01-01T11:00:00Z'
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('conflicts');
    });
  });
});

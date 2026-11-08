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
app.use((req: any, _res, next) => {
  req.user = { userId: 'test-user-id', tenantId: 'test-tenant-id', role: 'admin' };
  next();
});

app.use('/api/schedule', scheduleRoutes);
app.use(errorMiddleware);

describe('Schedule Integration Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/schedule/weekly', () => {
    it('should return 200 and a list of sessions', async () => {
      const mockData = [
        { id: '1', title: 'Session 1' },
      ];
      (ScheduleService.getWeeklySchedule as jest.Mock<any>).mockResolvedValue(mockData);

      const res = await request(app).get('/api/schedule/weekly?startDate=2023-01-01');

      expect(res.status).toBe(200);
      expect(res.body.data.sessions).toEqual(mockData);
      expect(ScheduleService.getWeeklySchedule).toHaveBeenCalledWith(
        'test-tenant-id', expect.objectContaining({ startDate: '2023-01-01' }), 'admin', undefined
      );
    });
  });

  describe('POST /api/schedule/sessions', () => {
    it('should create a session and return 201', async () => {
      const mockResponse = { id: '2', title: 'New Session' };
      (ScheduleService.createSession as jest.Mock<any>).mockResolvedValue({ success: true, data: mockResponse });

      const res = await request(app)
        .post('/api/schedule/sessions')
        .send({
          classId: '11111111-1111-4111-8111-111111111111',
          teacherId: '22222222-2222-4222-8222-222222222222',
          roomId: '33333333-3333-4333-8333-333333333333',
          sessionDate: '2023-01-01',
          startTime: '10:00',
          endTime: '11:00'
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(mockResponse);
      expect(ScheduleService.createSession).toHaveBeenCalledWith(
        'test-tenant-id',
        'test-user-id',
        expect.objectContaining({ sessionDate: '2023-01-01' })
      );
    });

    it('should return conflict error if conflict exists', async () => {
      (ScheduleService.createSession as jest.Mock<any>).mockResolvedValue({
        success: false, conflicts: [{ id: 'conflict-1' }]
      });

      const res = await request(app)
        .post('/api/schedule/sessions')
        .send({
          classId: '11111111-1111-4111-8111-111111111111',
          teacherId: '22222222-2222-4222-8222-222222222222',
          roomId: '33333333-3333-4333-8333-333333333333',
          sessionDate: '2023-01-01',
          startTime: '10:00',
          endTime: '11:00'
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('conflicts');
    });
  });
});

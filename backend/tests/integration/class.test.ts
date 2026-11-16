import request from 'supertest';
import express from 'express';
import pinoHttp from 'pino-http';
import classRoutes from '../../src/routes/class.routes';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import { logger } from '../../src/utils/logger';
import { ClassService } from '../../src/services/class.service';
import { ScheduleConflictError, scheduleWriteError } from '../../src/utils/errors';
import { ERROR_CODES } from '../../src/utils/constants';
import {
  createClassSchema,
  MAX_RECURRING_SCHEDULES,
  MAX_ENROLLMENTS_PER_REQUEST,
} from '../../src/validators/class.validator';

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
  req.user = {
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    role: 'admin',
    email: 'admin@example.test',
  };
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
      const mockData = [{ id: '1', name: 'Class 1', status: 'active' }];
      (ClassService.getClasses as jest.Mock<any>).mockResolvedValue(mockData);

      const res = await request(app).get('/api/classes');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockData);
      expect(ClassService.getClasses).toHaveBeenCalledWith(
        'test-tenant-id',
        'admin',
        'admin@example.test'
      );
    });
  });

  describe('POST /api/classes', () => {
    it('returns the blocked recurring slot in the existing schedule conflict format', async () => {
      const slot = { date: '2030-04-01', startTime: '08:00', endTime: '09:00' };
      const dbError = { code: '23P01', constraint: 'schedule_sessions_room_overlap' };
      const conflict = scheduleWriteError(dbError, slot);
      expect(conflict).toBeInstanceOf(ScheduleConflictError);
      expect(scheduleWriteError({ code: '23P01', constraint: 'other' })).not.toBeInstanceOf(
        ScheduleConflictError
      );
      jest.mocked(ClassService.createClass).mockRejectedValue(conflict);
      const recurring = [
        {
          day_of_week: '1',
          start_time: '08:00',
          end_time: '09:00',
          room_id: '11111111-1111-4111-8111-111111111111',
        },
      ];

      const response = await request(app).post('/api/classes').send({
        name: 'Recurring class',
        branch_id: recurring[0].room_id,
        recurring_schedules: recurring,
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        error: 'SCHEDULE_CONFLICT',
        conflicts: [{ conflict_type: 'ROOM_CONFLICT' }],
        slot,
      });
      expect(ClassService.createClass).toHaveBeenCalledWith(
        'test-tenant-id',
        expect.objectContaining({ recurring_schedules: recurring })
      );
    });
    it('should return 400 validation error if required fields are missing', async () => {
      const res = await request(app).post('/api/classes').send({
        // Missing name, course_id, branch_id
      });

      // Zod validation should block it
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should create a class and return 201', async () => {
      const mockResponse = { id: '2', name: 'New Class' };
      (ClassService.createClass as jest.Mock<any>).mockResolvedValue(mockResponse);

      const res = await request(app).post('/api/classes').send({
        name: 'New Class',
        branch_id: '11111111-1111-4111-8111-111111111111',
        start_date: '2023-01-01',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockResponse);
      expect(ClassService.createClass).toHaveBeenCalledWith(
        'test-tenant-id',
        expect.objectContaining({ name: 'New Class' })
      );
    });
  });

  it('rejects enrollment changes that add and remove the same student', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const studentId = '22222222-2222-4222-8222-222222222222';
    const response = await request(app)
      .put(`/api/classes/${id}`)
      .send({
        enrollment_changes: { add: [studentId], remove: [studentId] },
      });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(ClassService.updateClass).not.toHaveBeenCalled();
  });

  describe('request collection budgets', () => {
    const classId = '11111111-1111-4111-8111-111111111111';
    const classBody = { name: 'Bounded class', branch_id: classId };
    const oversizedEnrollments = Array.from(
      { length: MAX_ENROLLMENTS_PER_REQUEST + 1 },
      () => null
    );

    it('rejects an oversized invalid collection without building an issue for every item', async () => {
      const result = await createClassSchema.safeParseAsync({
        body: { ...classBody, recurring_schedules: Array(10_000).fill(null) },
      });
      expect(result.success).toBe(false);
      if (result.success) throw new Error('Oversized collection was accepted');
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          code: 'too_big',
          path: ['body', 'recurring_schedules'],
          message: ERROR_CODES.CLASS_RECURRING_LIMIT_EXCEEDED,
        }),
      ]);
    });

    it.each([
      {
        method: 'post' as const,
        path: '/api/classes',
        body: { ...classBody, recurring_schedules: Array(MAX_RECURRING_SCHEDULES + 1).fill(null) },
        code: ERROR_CODES.CLASS_RECURRING_LIMIT_EXCEEDED,
        limit: MAX_RECURRING_SCHEDULES,
      },
      {
        method: 'put' as const,
        path: `/api/classes/${classId}`,
        body: { recurring_schedules: Array(MAX_RECURRING_SCHEDULES + 1).fill(null) },
        code: ERROR_CODES.CLASS_RECURRING_LIMIT_EXCEEDED,
        limit: MAX_RECURRING_SCHEDULES,
      },
      {
        method: 'post' as const,
        path: '/api/classes',
        body: { ...classBody, enrollments: oversizedEnrollments },
        code: ERROR_CODES.CLASS_ENROLLMENT_LIMIT_EXCEEDED,
        limit: MAX_ENROLLMENTS_PER_REQUEST,
      },
      {
        method: 'put' as const,
        path: `/api/classes/${classId}`,
        body: { enrollments: oversizedEnrollments },
        code: ERROR_CODES.CLASS_ENROLLMENT_LIMIT_EXCEEDED,
        limit: MAX_ENROLLMENTS_PER_REQUEST,
      },
      {
        method: 'put' as const,
        path: `/api/classes/${classId}`,
        body: { enrollment_changes: { add: oversizedEnrollments, remove: [] } },
        code: ERROR_CODES.CLASS_ENROLLMENT_LIMIT_EXCEEDED,
        limit: MAX_ENROLLMENTS_PER_REQUEST,
      },
      {
        method: 'put' as const,
        path: `/api/classes/${classId}`,
        body: { enrollment_changes: { add: [], remove: oversizedEnrollments } },
        code: ERROR_CODES.CLASS_ENROLLMENT_LIMIT_EXCEEDED,
        limit: MAX_ENROLLMENTS_PER_REQUEST,
      },
      {
        method: 'post' as const,
        path: `/api/classes/${classId}/students`,
        body: { student_ids: oversizedEnrollments },
        code: ERROR_CODES.CLASS_ENROLLMENT_LIMIT_EXCEEDED,
        limit: MAX_ENROLLMENTS_PER_REQUEST,
      },
    ])(
      'blocks oversized $method $path before a write',
      async ({ method, path, body, code, limit }) => {
        const response = await request(app)[method](path).send(body);
        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({ code, params: { limit } });
        expect(ClassService.createClass).not.toHaveBeenCalled();
        expect(ClassService.updateClass).not.toHaveBeenCalled();
        expect(ClassService.enrollStudent).not.toHaveBeenCalled();
      }
    );

    it('keeps valid requests at the collection limits accepted', async () => {
      const result = await createClassSchema.safeParseAsync({
        body: {
          ...classBody,
          recurring_schedules: Array.from({ length: MAX_RECURRING_SCHEDULES }, () => ({
            day_of_week: '1',
            start_time: '08:00',
            end_time: '09:00',
            room_id: classId,
          })),
          enrollments: Array.from(
            { length: MAX_ENROLLMENTS_PER_REQUEST },
            (_, index) => `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`
          ),
        },
      });
      expect(result.success).toBe(true);
    });
  });
});

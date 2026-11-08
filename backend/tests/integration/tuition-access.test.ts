import request from 'supertest';
import express from 'express';
import tuitionRoutes from '../../src/routes/tuition.routes';
import { TuitionService } from '../../src/services/tuition.service';

jest.mock('../../src/services/tuition.service');
jest.mock('../../src/middlewares/auth.middleware', () => {
  const actual = jest.requireActual<typeof import('../../src/middlewares/auth.middleware')>(
    '../../src/middlewares/auth.middleware'
  );
  return {
    ...actual,
    authMiddleware: (req: any, _res: any, next: any) => {
      req.user = { userId: 'user-a', tenantId: 'tenant-a', role: req.headers['x-test-role'] || 'student' };
      next();
    },
  };
});

const app = express();
app.use('/api/tuitions', tuitionRoutes);

describe('Tuition access control', () => {
  afterEach(() => jest.clearAllMocks());

  it('denies a student the center-wide tuition list and overdue totals', async () => {
    const list = await request(app).get('/api/tuitions').set('x-test-role', 'student');
    const overdue = await request(app).get('/api/tuitions/overdue').set('x-test-role', 'student');
    expect(list.status).toBe(403);
    expect(overdue.status).toBe(403);
    expect(TuitionService.getTuitions).not.toHaveBeenCalled();
    expect(TuitionService.getOverdueTuitions).not.toHaveBeenCalled();
  });

  it('allows an admin to read the tenant tuition list', async () => {
    (TuitionService.getTuitions as jest.Mock<any>).mockResolvedValue({ data: [], summary: {} });
    const response = await request(app).get('/api/tuitions').set('x-test-role', 'admin');
    expect(response.status).toBe(200);
    expect(TuitionService.getTuitions).toHaveBeenCalledWith('tenant-a', expect.any(Object));
  });
});

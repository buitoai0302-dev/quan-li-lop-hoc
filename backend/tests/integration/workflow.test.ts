import request from 'supertest';
import express from 'express';
import pinoHttp from 'pino-http';
import dashboardRoutes from '../../src/routes/dashboard.routes';
import studentRoutes from '../../src/routes/student.routes';
import { WorkItemsService } from '../../src/services/work-items.service';
import { StudentProfileService } from '../../src/services/student-profile.service';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';
import { logger } from '../../src/utils/logger';
import { tuitionListQuerySchema } from '../../src/validators/tuition.validator';

jest.mock('../../src/services/work-items.service');
jest.mock('../../src/services/student-profile.service');
jest.mock('../../src/services/student.service');
jest.mock('../../src/services/dashboard.service');
jest.mock('../../src/db', () => ({ __esModule:true, default: { query: jest.fn(() => { throw new Error('Unexpected database access'); }) } }));

const tenantId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const app = express();
app.use(pinoHttp({ logger, autoLogging: false }));
app.use((req: AuthRequest, _res, next) => {
  req.tenantId = tenantId;
  req.user = { userId: studentId, tenantId: 'different-auth-tenant', branchId: null, role: req.header('x-qa-role') || 'admin', email: 'qa@example.test' };
  next();
});
app.use('/dashboard', dashboardRoutes);
app.use('/students', studentRoutes);
app.use(errorMiddleware);

describe('Workflow endpoint contracts', () => {
  it('uses the effective authenticated tenant and bounded pagination', async () => {
    jest.mocked(WorkItemsService.getWorkItems).mockResolvedValue({businessDate:'2026-11-15',groups:[]});
    expect((await request(app).get('/dashboard/work-items?group=attendance&limit=20&offset=5')).status).toBe(200);
    expect(WorkItemsService.getWorkItems).toHaveBeenCalledWith(tenantId, expect.objectContaining({role:'admin'}), {group:'attendance',limit:20,offset:5});
    for(const query of ['limit=0','limit=51','offset=-1','group=users','offset=1.5']) expect((await request(app).get(`/dashboard/work-items?${query}`)).status).toBe(400);
  });
  it('denies non-management profile reads and rejects invalid history selectors', async () => {
    for(const role of ['teacher','student','api_reader']) {
      expect((await request(app).get(`/students/${studentId}/profile`).set('x-qa-role',role)).status).toBe(403);
      expect((await request(app).get(`/students/${studentId}/history?type=payments`).set('x-qa-role',role)).status).toBe(403);
    }
    expect((await request(app).get('/dashboard/work-items').set('x-qa-role','api_reader')).status).toBe(403);
    expect((await request(app).get('/dashboard/work-items').set('x-qa-role','student')).status).toBe(403);
    for(const query of ['type=users','type=payments&limit=1000','type=attendance&offset=-1']) expect((await request(app).get(`/students/${studentId}/history?${query}`)).status).toBe(400);
    expect(StudentProfileService.getHistory).not.toHaveBeenCalled();
    jest.mocked(StudentProfileService.getHistory).mockResolvedValue({items:[],total:0,limit:20,offset:0});
    expect((await request(app).get(`/students/${studentId}/history?type=classes`).set('x-qa-role','staff')).status).toBe(200);
    expect(StudentProfileService.getHistory).toHaveBeenCalledWith(tenantId,studentId,'staff',{type:'classes',limit:20,offset:0});
  });
  it('keeps empty tuition filters compatible while rejecting malformed identifiers and limits', () => {
    expect(tuitionListQuerySchema.parse({status:'',student_id:''})).toMatchObject({status:undefined,student_id:undefined,limit:100,offset:0});
    expect(tuitionListQuerySchema.safeParse({tuition_id:'invalid'}).success).toBe(false);
    expect(tuitionListQuerySchema.safeParse({limit:'1001'}).success).toBe(false);
  });
});

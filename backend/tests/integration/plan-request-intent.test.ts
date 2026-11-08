import pool from '../../src/db';
import { createPlanRequest } from '../../src/controllers/plan.controller';

describe('plan request and signup intent', () => {
  afterEach(() => jest.restoreAllMocks());

  it('clears signup intent only after a request is inserted in the same transaction', async () => {
    const statements: string[] = [];
    const client = {
      query: jest.fn(async (sql: string) => {
        statements.push(sql);
        if (sql.includes('FROM plan_definitions')) return { rows: [{ id: 'plan-1' }] };
        if (sql.includes('FROM plan_requests')) return { rows: [] };
        if (sql.startsWith('INSERT INTO plan_requests')) return { rows: [{ id: 'request-1' }] };
        return { rows: [{ id: 'tenant-1' }] };
      }),
      release: jest.fn(),
    };
    jest.spyOn(pool, 'connect').mockResolvedValue(client as never);
    const req = { body: { planId: 'plan-1', billingCycle: 'YEARLY' }, user: { tenantId: 'tenant-1' } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await createPlanRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(statements.indexOf('COMMIT')).toBeGreaterThan(statements.findIndex(sql => sql.startsWith('UPDATE tenants SET signup_plan_id')));
    expect(statements.findIndex(sql => sql.startsWith('UPDATE tenants SET signup_plan_id'))).toBeGreaterThan(statements.findIndex(sql => sql.startsWith('INSERT INTO plan_requests')));
    expect(client.release).toHaveBeenCalled();
  });

  it('keeps signup intent when an upgrade request is already pending', async () => {
    const statements: string[] = [];
    const client = {
      query: jest.fn(async (sql: string) => {
        statements.push(sql);
        if (sql.includes('FROM plan_definitions')) return { rows: [{ id: 'plan-1' }] };
        if (sql.includes('FROM plan_requests')) return { rows: [{ id: 'pending-1' }] };
        return { rows: [{ id: 'tenant-1' }] };
      }),
      release: jest.fn(),
    };
    jest.spyOn(pool, 'connect').mockResolvedValue(client as never);
    const req = { body: { planId: 'plan-1', billingCycle: 'MONTHLY' }, user: { tenantId: 'tenant-1' } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await createPlanRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(statements).toContain('ROLLBACK');
    expect(statements.some(sql => sql.startsWith('UPDATE tenants SET signup_plan_id'))).toBe(false);
  });

  it('rejects a plan that is no longer active without creating a request', async () => {
    const statements: string[] = [];
    const client = {
      query: jest.fn(async (sql: string) => {
        statements.push(sql);
        if (sql.includes('FROM plan_definitions')) return { rows: [] };
        return { rows: [] };
      }), release: jest.fn(),
    };
    jest.spyOn(pool, 'connect').mockResolvedValue(client as never);
    const req = { body: { planId: 'inactive', billingCycle: 'YEARLY' }, user: { tenantId: 'tenant-1' } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await createPlanRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(statements.some(sql => sql.startsWith('INSERT INTO plan_requests'))).toBe(false);
    expect(statements).toContain('ROLLBACK');
  });
});

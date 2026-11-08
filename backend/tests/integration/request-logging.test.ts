import { IncomingMessage } from 'http';
import { safeRequestLog, requestLogContext } from '../../src/utils/request-logging';
import { AuthRequest } from '../../src/middlewares/auth.middleware';
import express from 'express';
import request from 'supertest';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { Writable } from 'stream';

describe('operational request logging', () => {
  it('omits OAuth codes, verification tokens and credential headers', () => {
    const req = {
      id: 'request-1', method: 'GET',
      url: '/api/google/callback?code=secret-code&state=secret-state',
      headers: { authorization: 'Bearer secret-token' },
    } as unknown as IncomingMessage & { id: string };
    expect(safeRequestLog(req)).toEqual({
      id: 'request-1', method: 'GET', url: '/api/google/callback',
    });
  });

  it('uses validated tenant context rather than an untrusted header', () => {
    const req = { headers: { 'x-tenant-id': 'forged' } } as unknown as AuthRequest;
    expect(requestLogContext(req)).toEqual({});
    req.tenantId = 'real-tenant';
    req.user = { userId: 'actor-1', tenantId: 'real-tenant', branchId: null, role: 'admin', email: 'actor@example.test' };
    expect(requestLogContext(req)).toEqual({ tenantId: 'real-tenant', actorId: 'actor-1' });
  });

  it('emits tenant-scoped JSON without URL secrets after route authentication', async () => {
    const lines: string[] = [];
    const stream = new Writable({ write(chunk, _encoding, next) { lines.push(chunk.toString()); next(); } });
    const app = express();
    app.use(pinoHttp({
      logger: pino(stream), serializers: { req: safeRequestLog },
      customProps: requestLogContext, genReqId: () => 'request-2',
    }));
    app.get('/secret', (req, res) => {
      (req as AuthRequest).tenantId = 'tenant-2';
      (req as AuthRequest).user = { userId: 'actor-2', tenantId: 'tenant-2', branchId: null, role: 'admin', email: 'actor@example.test' };
      res.sendStatus(204);
    });

    await request(app).get('/secret?token=hidden').set('authorization', 'Bearer hidden');
    const entry = JSON.parse(lines[lines.length - 1] || '{}');
    expect(entry).toMatchObject({ tenantId: 'tenant-2', actorId: 'actor-2', req: { id: 'request-2', url: '/secret' } });
    expect(lines.join('')).not.toContain('hidden');
  });
});

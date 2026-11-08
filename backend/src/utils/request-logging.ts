import { IncomingMessage } from 'http';
import type { AuthRequest } from '../middlewares/auth.middleware';

export function safeRequestLog(req: IncomingMessage & { id?: string }) {
  return { id: req.id, method: req.method, url: req.url?.split('?')[0] };
}

export function requestLogContext(req: IncomingMessage) {
  const request = req as AuthRequest;
  return {
    ...(request.tenantId ? { tenantId: request.tenantId } : {}),
    ...(request.user?.userId ? { actorId: request.user.userId } : {}),
  };
}

import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware';
import { ROLES } from '../utils/constants';

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
      };
    }
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const tenantMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Only authentication middleware may resolve a tenant from a header.
  const tenantId = req.tenantId || req.user?.tenantId;
  const userRole = req.user?.role;

  if (!tenantId && userRole !== ROLES.SUPER_ADMIN) {
    res.status(401).json({
      success: false,
      message: 'An authenticated tenant context is required',
    });
    return;
  }

  // Validate UUID format nếu có tenantId (tránh injection qua header)
  if (tenantId && !UUID_REGEX.test(tenantId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid Tenant ID format',
    });
    return;
  }

  // Simply attach the ID if exists.
  if (tenantId) {
    req.tenant = {
      id: tenantId,
    };
  }

  next();
};

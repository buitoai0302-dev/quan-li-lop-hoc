import { Request, Response, NextFunction } from 'express';
import { ROLES, HTTP_HEADERS } from '../utils/constants';

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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract tenantId injected by authMiddleware, fallback to header for testing
  const tenantId = (req as any).tenantId || req.header(HTTP_HEADERS.TENANT_ID);
  const userRole = (req as any).user?.role;

  if (!tenantId && userRole !== ROLES.SUPER_ADMIN) {
    res.status(401).json({
      success: false,
      message: 'Tenant ID is required (Missing token or x-tenant-id header)',
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

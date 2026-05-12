import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
      };
    }
  }
}

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract tenantId injected by authMiddleware, fallback to header for testing
  const tenantId = (req as any).tenantId || req.header('x-tenant-id');
  const userRole = (req as any).user?.role;

  if (!tenantId && userRole !== 'super_admin') {
    res
      .status(401)
      .json({
        success: false,
        message: 'Tenant ID is required (Missing token or x-tenant-id header)',
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

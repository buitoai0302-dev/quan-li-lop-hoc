import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    branchId: string | null;
    role: string;
    email: string;
  };
  tenantId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'eduschedule-super-secret-jwt-key-2024-change-in-production';
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] No Bearer token');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    
    // Also inject tenantId so it can replace tenantMiddleware logic for authenticated routes
    if (decoded.tenantId) {
      req.tenantId = decoded.tenantId;
    }
    
    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log(`[AUTH] Path: ${req.path}, User: ${req.user?.email}, Role: ${req.user?.role}, Required: ${roles}`);
    
    // Super Admin always has access to everything
    if (req.user?.role === 'super_admin') {
      return next();
    }

    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

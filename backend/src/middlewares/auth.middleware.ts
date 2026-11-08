import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ROLES, HTTP_HEADERS, API_PRINCIPALS } from '../utils/constants';

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

import { config } from '../utils/config';
import pool from '../db';

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.userId === API_PRINCIPALS.USER_ID && req.user.role === API_PRINCIPALS.READER)
    return next();
  const JWT_SECRET = config.jwtSecret();
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const status = await pool.query(
      `SELECT u.is_active AS user_active, u.role, t.is_active AS tenant_active
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1 AND u.tenant_id = $2`,
      [decoded.userId, decoded.tenantId]
    );
    if (
      status.rows.length === 0 ||
      !status.rows[0].user_active ||
      status.rows[0].role !== decoded.role ||
      (!status.rows[0].tenant_active && status.rows[0].role !== ROLES.SUPER_ADMIN)
    ) {
      return res.status(401).json({ error: 'Account inactive' });
    }
    req.user = decoded;

    // Also inject tenantId so it can replace tenantMiddleware logic for authenticated routes
    if (decoded.tenantId) {
      req.tenantId = decoded.tenantId;
    }

    // Super Admin Tenant Impersonation
    if (decoded.role === ROLES.SUPER_ADMIN && req.headers[HTTP_HEADERS.TENANT_ID]) {
      req.tenantId = req.headers[HTTP_HEADERS.TENANT_ID] as string;
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: readonly string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Super Admin always has access to everything
    if (req.user?.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

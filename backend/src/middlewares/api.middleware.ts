import { logger } from '../utils/logger';
import { Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from './auth.middleware';
import { ROLES, HTTP_HEADERS } from '../utils/constants';

export const apiKeyMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers[HTTP_HEADERS.API_KEY];

  if (!apiKey) {
    return next(); // Continue to next middleware (likely authMiddleware)
  }

  try {
    const result = await pool.query(
      'SELECT id, name FROM tenants WHERE api_key = $1 AND is_active = true',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    const tenant = result.rows[0];

    // Inject a "virtual" user for the API request
    req.user = {
      userId: 'api_user',
      tenantId: tenant.id,
      branchId: null,
      role: ROLES.ADMIN, // API access acts as admin
      email: `api@${tenant.name.toLowerCase().replace(/\s+/g, '-')}.com`,
    };
    req.tenantId = tenant.id;

    next();
  } catch (error) {
    logger.error(error, 'API Key Middleware Error:');
    res.status(500).json({ error: 'Internal server error' });
  }
};

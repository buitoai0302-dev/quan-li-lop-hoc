import { logger } from '../utils/logger';
import { Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from './auth.middleware';
import { HTTP_HEADERS, API_PRINCIPALS } from '../utils/constants';

export const apiKeyMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers[HTTP_HEADERS.API_KEY];

  if (!apiKey) {
    return next(); // Continue to next middleware (likely authMiddleware)
  }

  // API keys are read-only and limited to endpoints intended for integration.
  if (req.method !== 'GET' || !['/classes', '/rooms', '/schedule/weekly'].includes(req.path)) {
    return res.status(403).json({ error: 'API key scope does not permit this endpoint' });
  }

  try {
    const result = await pool.query(
      `SELECT t.id, t.name FROM tenants t
       JOIN plan_features pf ON pf.plan_id = t.plan_id AND pf.feature_key = 'api_access'
       WHERE t.api_key = $1 AND t.is_active = true AND pf.is_enabled = true`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    const tenant = result.rows[0];

    // Inject a "virtual" user for the API request
    req.user = {
      userId: API_PRINCIPALS.USER_ID,
      tenantId: tenant.id,
      branchId: null,
      role: API_PRINCIPALS.READER,
      email: `api@${tenant.name.toLowerCase().replace(/\s+/g, '-')}.com`,
    };
    req.tenantId = tenant.id;

    next();
  } catch (error) {
    logger.error(error, 'API Key Middleware Error:');
    res.status(500).json({ error: 'Internal server error' });
  }
};

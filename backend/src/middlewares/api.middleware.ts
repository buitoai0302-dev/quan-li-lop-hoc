import { Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from './auth.middleware';

export const apiKeyMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

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
      role: 'admin', // API access acts as admin
      email: `api@${tenant.name.toLowerCase().replace(/\s+/g, '-')}.com`
    };
    req.tenantId = tenant.id;

    next();
  } catch (error) {
    console.error('API Key Middleware Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { Request, Response, NextFunction } from 'express';
import { FeatureFlagService } from '../services/feature-flag.service';
import { query } from '../db';

/**
 * Middleware to check if a tenant has a specific feature enabled.
 */
export const requireFeature = (featureKey: string) => {
  return async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.tenantId || req.tenant?.id || req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const hasFeature = await FeatureFlagService.isEnabled(tenantId, featureKey);
      
      if (!hasFeature) {
        res.status(403).json({ 
          success: false, 
          error: 'FEATURE_DISABLED',
          message: `Your current plan does not support the '${featureKey}' feature. Please upgrade your plan.`
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to enforce a numerical limit before creating a resource.
 * countQuery: A SQL query that returns the current count of the resource for the tenant.
 * example: enforceLimit('max_classes', 'SELECT COUNT(*) FROM classes WHERE tenant_id = $1')
 */
export const enforceLimit = (limitKey: string, countQuery: string) => {
  return async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.tenantId || req.tenant?.id || req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const limit = await FeatureFlagService.checkLimit(tenantId, limitKey);
      
      // -1 means unlimited
      if (limit === -1) {
        next();
        return;
      }

      // If limit is 0 or less than 0 (but not -1), it's strictly not allowed
      if (limit <= 0) {
        res.status(403).json({ 
          success: false, 
          error: 'LIMIT_EXCEEDED',
          message: `Your plan does not allow this resource (${limitKey}).`
        });
        return;
      }

      // Check current count
      const result = await query(countQuery, [tenantId]);
      const currentCount = parseInt(result.rows[0].count, 10);

      if (currentCount >= limit) {
        res.status(403).json({ 
          success: false, 
          error: 'LIMIT_EXCEEDED',
          message: `You have reached the maximum allowed limit for ${limitKey} (${limit}). Please upgrade your plan.`
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

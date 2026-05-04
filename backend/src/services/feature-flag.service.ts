import NodeCache from 'node-cache';
import { query } from '../db';

// Cache for 60 seconds as specified in the diagram
export const cache = new NodeCache({ stdTTL: 60 });

interface PlanDetails {
  plan_id: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

export class FeatureFlagService {
  /**
   * Fetches the full plan definitions, features, and limits for a tenant.
   * Caches the result in Redis/NodeCache for 60s.
   */
  public static async getTenantPlan(tenantId: string): Promise<PlanDetails | null> {
    const cacheKey = `tenant_plan_${tenantId}`;
    
    // Check Cache
    const cached = cache.get<PlanDetails>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query DB
    const tenantSql = `SELECT plan_id FROM tenants WHERE id = $1`;
    const tenantRes = await query(tenantSql, [tenantId]);
    
    if (tenantRes.rows.length === 0) return null;
    const planId = tenantRes.rows[0].plan_id;

    const featuresSql = `SELECT feature_key, is_enabled FROM plan_features WHERE plan_id = $1`;
    const featuresRes = await query(featuresSql, [planId]);
    
    const limitsSql = `SELECT limit_key, limit_value FROM plan_limits WHERE plan_id = $1`;
    const limitsRes = await query(limitsSql, [planId]);

    const planDetails: PlanDetails = {
      plan_id: planId,
      features: {},
      limits: {}
    };

    featuresRes.rows.forEach(row => {
      planDetails.features[row.feature_key] = row.is_enabled;
    });

    limitsRes.rows.forEach(row => {
      planDetails.limits[row.limit_key] = row.limit_value;
    });

    // Save to Cache
    cache.set(cacheKey, planDetails);

    return planDetails;
  }

  /**
   * Checks if a specific feature is enabled for the tenant.
   */
  public static async isEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    const plan = await this.getTenantPlan(tenantId);
    if (!plan) return false;
    return !!plan.features[featureKey];
  }

  /**
   * Gets the limit value for a specific key. Returns -1 if unlimited.
   */
  public static async checkLimit(tenantId: string, limitKey: string): Promise<number> {
    const plan = await this.getTenantPlan(tenantId);
    if (!plan || plan.limits[limitKey] === undefined) return 0; // 0 means not allowed by default
    return plan.limits[limitKey];
  }
}

import { FeatureFlagService } from '../services/feature-flag.service';
import { LimitExceededError } from '../utils/errors';
import pool from '../db';
import { ERROR_CODES } from './constants';

export const checkPlanLimit = async (
  tenantId: string,
  limitKey: string,
  tableName: string,
  errorKey: string = ERROR_CODES.LIMIT_EXCEEDED
) => {
  const limit = await FeatureFlagService.checkLimit(tenantId, limitKey);
  
  if (limit === -1) return; // Unlimited

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM ${tableName} WHERE tenant_id = $1 AND is_deleted = false`,
    [tenantId]
  );
  
  const currentCount = parseInt(countRes.rows[0].count, 10);
  
  if (currentCount >= limit) {
    throw new LimitExceededError('Plan limit exceeded', errorKey);
  }
};

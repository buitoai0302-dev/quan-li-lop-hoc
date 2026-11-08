import type { PoolClient } from 'pg';
import { PLAN_CODES } from './constants';

export const getFreePlanId = async (client: PoolClient): Promise<string> => {
  const result = await client.query('SELECT id FROM plan_definitions WHERE code = $1', [
    PLAN_CODES.FREE,
  ]);
  const id = result.rows[0]?.id;
  if (!id) throw new Error('FREE plan is missing from plan_definitions');
  return id;
};

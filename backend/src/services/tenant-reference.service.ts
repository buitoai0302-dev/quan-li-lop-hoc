import { ERROR_CODES } from '../utils/constants';
import { Pool, PoolClient } from 'pg';
import { ValidationError } from '../utils/errors';

type TenantTable = 'branches' | 'subjects' | 'teachers' | 'rooms' | 'students' | 'classes';

// Keep table names in a fixed allowlist; only UUID values are supplied by callers.
export async function assertTenantReferences(
  db: Pool | PoolClient,
  tenantId: string,
  table: TenantTable,
  ids: Array<string | null | undefined>
): Promise<void> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (uniqueIds.length === 0) return;
  if (
    uniqueIds.some(
      (id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    )
  ) {
    throw new ValidationError('Invalid resource ID', ERROR_CODES.INVALID_TENANT_REFERENCE);
  }

  const result = await db.query(
    `SELECT id FROM ${table} WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
    [tenantId, uniqueIds]
  );
  if (result.rows.length !== uniqueIds.length) {
    throw new ValidationError(
      'Tài nguyên không thuộc trung tâm hiện tại',
      ERROR_CODES.INVALID_TENANT_REFERENCE
    );
  }
}

import type { PoolClient } from 'pg';

// Imported class names have no unique constraint. Share this lock across both
// import endpoints so concurrent files cannot create the same class twice.
export async function lockTenantImport(client: PoolClient, tenantId: string): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
    `tenant-import:${tenantId}`,
  ]);
}

import type { PoolClient } from 'pg';

// Serialize application schedule writers within one tenant before they acquire
// row locks. Exclusion constraints also protect writes from outside the app.
export async function lockScheduleWrites(client: PoolClient, tenantId: string) {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('schedule:' || $1::uuid::text, 0))",
    [tenantId]
  );
}

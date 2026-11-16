// Synthetic process-crash fixture. Never loads real provider credentials or calls Google.
const url = new URL(process.env.PG_INTEGRITY_TEST_URL);
if (
  process.env.PG_INTEGRITY_CONFIRMATION !== 'isolated-synthetic-staging' ||
  !['/eduschedule_integrity_test', '/eduschedule_staging'].includes(url.pathname)
) {
  throw new Error('Isolated PostgreSQL is required');
}
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.PG_INTEGRITY_TEST_URL });
require.cache[require.resolve('../../src/db.ts')] = {
  exports: { __esModule: true, default: pool },
};
const provider = require('../../src/services/google-calendar-provider.service.ts');
provider.getPersonalCalendar = () => ({
  events: {
    get: async () => {
      process.send({ state: 'claimed' });
      await new Promise(() => {});
    },
  },
});
require('../../src/services/google-sync.service.ts')
  .GoogleSyncService.processLink(process.argv[2])
  .catch(() => {
    process.exitCode = 1;
  });

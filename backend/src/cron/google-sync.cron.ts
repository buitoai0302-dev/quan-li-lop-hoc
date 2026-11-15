import boss from './queue';
import { GOOGLE_SYNC } from '../utils/google-sync';
import { GoogleSyncService } from '../services/google-sync.service';

export async function initGoogleSyncJobs(queue = boss) {
  await queue.work(GOOGLE_SYNC.JOB_NAME, async () => {
    if (await GoogleSyncService.processPending()) await queue.send(GOOGLE_SYNC.JOB_NAME, {});
  });
  await queue.schedule(
    GOOGLE_SYNC.JOB_NAME,
    '* * * * *',
    {},
    { retryLimit: 2, retryDelay: 30, retryBackoff: true }
  );
  await queue.send(GOOGLE_SYNC.JOB_NAME, {});
}

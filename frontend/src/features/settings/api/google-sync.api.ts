import { z } from 'zod';
import api from '@/api';

export const GOOGLE_SYNC_STATES = [
  'pending',
  'syncing',
  'synced',
  'retry_needed',
  'connection_required',
  'confirmation_required',
] as const;
const JobSchema = z.object({ id: z.string().uuid() });
const ProgressSchema = z.object({
  id: z.string().uuid().nullable(),
  paused: z.boolean(),
  total: z.number(),
  counts: z.record(z.enum(GOOGLE_SYNC_STATES), z.number()),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sessionId: z.string().uuid(),
      state: z.enum(GOOGLE_SYNC_STATES),
      attempts: z.number(),
      nextAttemptAt: z.string().nullable(),
      errorCode: z.string().nullable(),
      className: z.string().nullable(),
    })
  ),
});
export const createGoogleSyncJob = (requestId = crypto.randomUUID()) =>
  api.post('/google/sync-jobs', { requestId }).then(({ data }) => JobSchema.parse(data));
export const getGoogleSyncProgress = (jobId?: string, signal?: AbortSignal) =>
  api
    .get(jobId ? `/google/sync-jobs/${jobId}` : '/google/sync-jobs', { signal })
    .then(({ data }) => ProgressSchema.parse(data));
const RetryResultSchema = z.object({ id: z.string().uuid().nullable() });
export const retryGoogleSyncJob = (jobId?: string, confirmLegacy = false) =>
  api
    .post(jobId ? `/google/sync-jobs/${jobId}/retry` : '/google/sync-jobs/retry', { confirmLegacy })
    .then(({ data }) => RetryResultSchema.parse(data));

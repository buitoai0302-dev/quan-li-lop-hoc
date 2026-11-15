import { z } from 'zod';
export const createGoogleSyncJobSchema = z.object({
  body: z.object({ requestId: z.string().uuid().optional() }),
});
export const retryGoogleSyncJobSchema = z.object({
  body: z.object({ confirmLegacy: z.boolean().optional() }),
});

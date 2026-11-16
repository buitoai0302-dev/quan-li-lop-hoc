import { z } from 'zod';
import { MAX_BATCH_SESSIONS } from '../utils/constants';

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const slot = z
  .object({
    classId: z.string().uuid(),
    teacherId: z.string().uuid(),
    roomId: z.string().uuid(),
    sessionDate: z.iso.date(),
    startTime: time,
    endTime: time,
  })
  .refine((value) => value.endTime > value.startTime);
export const scheduleSuggestionsSchema = z.object({
  body: z.object({
    session: slot,
    excludeSessionId: z.string().uuid().optional(),
    draftSessions: z.array(slot).max(MAX_BATCH_SESSIONS).default([]),
    window: z
      .object({ startTime: time, endTime: time })
      .refine((value) => value.endTime > value.startTime)
      .optional(),
  }),
});
export type ScheduleSuggestionsRequest = z.infer<typeof scheduleSuggestionsSchema>['body'];

import { z } from 'zod';
import api from '@/api';

export const WORK_ITEM_TYPES = ['attendance', 'tuition', 'classes'] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];
const WorkItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().nullable(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  student_id: z.string().optional(),
  class_id: z.string().nullable().optional(),
  outstanding_vnd: z.string().optional(),
  missing_teacher: z.boolean().optional(),
  missing_sessions: z.boolean().optional(),
});
const WorkItemsSchema = z.object({
  businessDate: z.string(),
  groups: z.array(
    z.object({
      type: z.enum(WORK_ITEM_TYPES),
      items: z.array(WorkItemSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
    })
  ),
});
export type WorkItem = z.infer<typeof WorkItemSchema>;
export function getWorkItems(
  params: { group?: WorkItemType; limit?: number; offset?: number },
  signal?: AbortSignal
) {
  return api
    .get('/dashboard/work-items', { params, signal })
    .then((response) => WorkItemsSchema.parse(response.data));
}

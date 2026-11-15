import { z } from 'zod';
import {
  WORK_ITEM_TYPES,
  STUDENT_HISTORY_TYPES,
  WORKFLOW_PAGE_LIMIT,
  WORKFLOW_PREVIEW_LIMIT,
} from '../utils/workflow';

export const workItemsQuerySchema = z.object({
  group: z.enum(Object.values(WORK_ITEM_TYPES)).optional(),
  limit: z.coerce.number().int().min(1).max(WORKFLOW_PAGE_LIMIT).default(WORKFLOW_PREVIEW_LIMIT),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
});
export const studentHistoryQuerySchema = z.object({
  type: z.enum(Object.values(STUDENT_HISTORY_TYPES)),
  limit: z.coerce.number().int().min(1).max(WORKFLOW_PAGE_LIMIT).default(20),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
});
export const workItemsRequestSchema = z.object({ query: workItemsQuerySchema });
export const studentHistoryRequestSchema = z.object({ query: studentHistoryQuerySchema });

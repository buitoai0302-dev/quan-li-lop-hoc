export const WORK_ITEM_TYPES = {
  ATTENDANCE: 'attendance',
  TUITION: 'tuition',
  CLASSES: 'classes',
} as const;
export const STUDENT_HISTORY_TYPES = {
  CLASSES: 'classes',
  ATTENDANCE: 'attendance',
  PAYMENTS: 'payments',
} as const;
export const WORKFLOW_PREVIEW_LIMIT = 5;
export const WORKFLOW_PAGE_LIMIT = 50;
export const WORKFLOW_LOOKAHEAD_DAYS = 7;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[keyof typeof WORK_ITEM_TYPES];
export type StudentHistoryType = (typeof STUDENT_HISTORY_TYPES)[keyof typeof STUDENT_HISTORY_TYPES];

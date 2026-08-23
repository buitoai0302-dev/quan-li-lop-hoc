export const ERROR_CODES = {
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  SCHEDULE_CONFLICT: 'SCHEDULE_CONFLICT',
};

export const TENANT_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
};

export const PLAN_CODES = {
  FREE: 'FREE',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE',
};

export const DEFAULT_FREE_PLAN_ID = 'ffffffff-0000-0000-0000-000000000001';

export const PLAN_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// ─── User Roles ───────────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CENTER_ADMIN: 'center_admin',
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  STAFF: 'staff',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ─── Import Types ─────────────────────────────────────────────────────────────
export const IMPORT_TYPES = {
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  ROOMS: 'rooms',
  CLASSES: 'classes',
} as const;

export type ImportType = (typeof IMPORT_TYPES)[keyof typeof IMPORT_TYPES];

// ─── HTTP Headers ─────────────────────────────────────────────────────────────
export const HTTP_HEADERS = {
  TENANT_ID: 'x-tenant-id',
  API_KEY: 'x-api-key',
  AUTHORIZATION: 'authorization',
} as const;

// ─── Status Values ────────────────────────────────────────────────────────────
export const SESSION_STATUS = {
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  SCHEDULED: 'scheduled',
} as const;

export const TUITION_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  WAIVED: 'waived',
} as const;

export const CLASS_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// ─── Session Types ────────────────────────────────────────────────────────────
export const SESSION_TYPE = {
  LECTURE: 'lecture',
  EXAM: 'exam',
  MAKEUP: 'makeup',
  PRACTICE: 'practice',
} as const;

// ─── Enrollment Status ────────────────────────────────────────────────────────
export const ENROLLMENT_STATUS = {
  ENROLLED: 'enrolled',
  UNENROLLED: 'unenrolled',
  PENDING: 'pending',
} as const;

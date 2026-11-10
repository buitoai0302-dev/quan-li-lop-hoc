export const ERROR_CODES = {
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  SCHEDULE_CONFLICT: 'SCHEDULE_CONFLICT',
  INVALID_ID_FORMAT: 'INVALID_ID_FORMAT',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  ALREADY_PAID: 'ALREADY_PAID',
  BRANCH_NOT_FOUND: 'BRANCH_NOT_FOUND',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  HAS_PAYMENTS: 'HAS_PAYMENTS',
  IMPORT_BATCH_TOO_LARGE: 'IMPORT_BATCH_TOO_LARGE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  PAYMENT_EXCEEDS_BALANCE: 'PAYMENT_EXCEEDS_BALANCE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_CREDENTIALS_REMAINING: 'INVALID_CREDENTIALS_REMAINING',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  INVALID_DATA: 'INVALID_DATA',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  INVALID_IMPORT_DATA: 'INVALID_IMPORT_DATA',
  INVALID_IMPORT_TYPE: 'INVALID_IMPORT_TYPE',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  MOMO_ERROR: 'MOMO_ERROR',
  NO_STUDENTS_FOUND: 'NO_STUDENTS_FOUND',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RESET_PASSWORD_EXPIRED: 'RESET_PASSWORD_EXPIRED',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  SCHEDULE_REQUIRES_TEACHER_AND_ROOM: 'SCHEDULE_REQUIRES_TEACHER_AND_ROOM',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  STUDENT_NOT_ENROLLED: 'STUDENT_NOT_ENROLLED',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  TEACHER_NOT_FOUND: 'TEACHER_NOT_FOUND',
  TENANT_INACTIVE: 'TENANT_INACTIVE',
  TUITION_NOT_FOUND: 'TUITION_NOT_FOUND',
  UNSUPPORTED_GATEWAY: 'UNSUPPORTED_GATEWAY',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ZERO_AMOUNT: 'ZERO_AMOUNT',
  INVALID_TENANT_REFERENCE: 'INVALID_TENANT_REFERENCE',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  ONLINE_PAYMENTS_DISABLED: 'ONLINE_PAYMENTS_DISABLED',
  PAYMENT_MISMATCH: 'PAYMENT_MISMATCH',
  INVOICE_NOT_PENDING: 'INVOICE_NOT_PENDING',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

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

export const PLAN_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// ─── User Roles ───────────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// API keys use a virtual principal, not a user role stored in the database.
export const API_PRINCIPALS = {
  READER: 'api_reader',
  USER_ID: 'api_user',
} as const;

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

export const MAX_BATCH_SESSIONS = 30;

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

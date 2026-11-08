export const SYSTEM_DOMAIN = 'system';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_EMAIL: '/verify-email',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  CLASSES: '/classes',
  TEACHERS: '/teachers',
  STUDENTS: '/students',
  ROOMS: '/rooms',
  BRANCHES: '/branches',
  ATTENDANCE: '/attendance',
  SCHEDULE: '/schedule',
  SUBSCRIPTION: '/subscription',
  SETTINGS: '/settings',
  IMPORT: '/import',
  ACTIVITY_LOG: '/activities',
  HELP: '/help',
  RESEND_VERIFICATION: '/resend-verification',
  ADMIN_TENANTS: '/admin/tenants',
  ADMIN_PLANS: '/admin/plans',
  ADMIN_REQUESTS: '/admin/requests',
  ADMIN_USERS: '/admin/users',
  ADMIN_SETTINGS: '/admin/settings',
  TUITION: '/tuition',
  BILLING_RETURN: '/billing/return',
};

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

export const PLAN_REQUEST_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
};

export const TENANT_ACTIONS = {
  APPROVE: 'approve',
  SUSPEND: 'suspend',
  ACTIVATE: 'activate',
};

export const COMMON_STATUS = {
  ACTIVE: true,
  INACTIVE: false,
};

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
  NONE: 'none',
};

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  TEACHER: 'teacher',
  STUDENT: 'student',
};

export const VIEW_MODES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;

export const ROOM_TYPES = {
  CLASSROOM: 'classroom',
  LAB: 'lab',
  HALL: 'hall',
  MEETING: 'meeting',
} as const;

export const CLASS_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const ACTIVITY_TYPES = {
  STUDENT: 'student',
  CLASS: 'class',
  SESSION: 'session',
  TEACHER: 'teacher',
  BRANCH: 'branch',
  ROOM: 'room',
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export const STORAGE_KEYS = {
  THEME: 'app-theme',
} as const;

export const PREMIUM_FEATURES = {
  ATTENDANCE: 'attendance',
  BRANCHES: 'branches',
  TUITION: 'tuition',
} as const;

export const TUITION_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  WAIVED: 'waived',
} as const;

export type TuitionStatus = (typeof TUITION_STATUS)[keyof typeof TUITION_STATUS];

export const PAYMENT_METHODS = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  MOMO: 'momo',
  VNPAY: 'vnpay',
  STRIPE: 'stripe',
  OTHER: 'other',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const BILLING_CYCLE = {
  MONTHLY: 'monthly',
  PER_SESSION: 'per_session',
  PER_COURSE: 'per_course',
} as const;

export const BACKUP_CYCLES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export const PLAN_FIELDS = {
  LIMITS: 'limits',
  FEATURES: 'features',
} as const;

export const MENU_KEYS = {
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
  SUBSCRIPTION: 'subscription',
  HELP: 'help',
  ACTIVITIES: 'activities',
} as const;

export const PLAN_BILLING_CYCLE = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;

export const QUERY_KEYS = {
  SUBSCRIPTION_DATA: 'subscription-data',
} as const;

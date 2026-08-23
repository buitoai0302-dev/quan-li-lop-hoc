export const SYSTEM_DOMAIN = 'system';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
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

export const DEFAULT_FREE_PLAN_ID = '1c0fd778-0f94-44c1-86da-19bdafb1d9b3';

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

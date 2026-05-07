export const ERROR_CODES = {
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
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


import type { TFunction } from 'i18next';
import type React from 'react';

// ---------------------------------------------------------------------------
// Re-export all domain types from schemas (single source of truth)
// ---------------------------------------------------------------------------
export type {
  Branch,
  Teacher,
  Student,
  Room,
  ClassData,
  Session,
  Enrollment,
  AttendanceRecord,
  RecurringSchedule,
  StudentFormData,
  TeacherFormData,
  BranchFormData,
  RoomFormData,
  ClassBasicFormData,
  SessionFormData,
} from './types/schemas';

// ---------------------------------------------------------------------------
// Types that are NOT Zod-derived (app-level, UI-level, auth-level)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  branch_name?: string;
  email: string;
  full_name: string;
  role: string;
  tenant_name: string;
  plan_code?: string;
  plan_features?: Record<string, boolean>;
  onboarding_completed: boolean;
  notify_upcoming_sessions: boolean;
  is_google_connected: boolean;
  tenant_settings?: {
    menu: Record<string, boolean>;
  };
}

export interface HelpCategory {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  steps: string[];
  details: string;
  isPremium?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  contact_email?: string;
  status: string;
  plan_id: string;
  plan_name?: string;
  plan_code?: string;
  is_active?: boolean;
  user_count?: string;
  branch_count?: string;
  subscription_end: string;
  max_users: number;
  max_students: number;
  created_at: string;
  settings?: {
    menu?: Record<string, boolean>;
    backup?: {
      enabled: boolean;
      cycle: string;
      time: string;
      last_backup_at?: string;
    };
  };
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  price_vnd: number;
  price_usd: number;
  yearly_price_vnd: number;
  yearly_price_usd: number;
  is_active: boolean;
  limits: Record<string, number> | PlanLimit[];
  features: Record<string, boolean> | string[] | PlanFeature[];
  stripe_price_id?: string;
}

export interface PlanRequest {
  id: string;
  tenant_id?: string;
  tenant_name: string;
  contact_email?: string;
  requested_plan?: string;
  plan_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  billing_cycle: 'MONTHLY' | 'YEARLY';
  notes?: string;
  created_at: string;
}

export interface SubscriptionHistory {
  id: string;
  plan_name: string;
  amount: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface PlanLimit {
  limit_key: string;
  limit_value: number;
  label?: string;
}

export interface PlanFeature {
  feature_key: string;
  is_enabled: boolean;
  label?: string;
}

export interface AdminStats {
  totalTenants: number;
  totalUsers: number;
  totalSessions: number;
}

// ---------------------------------------------------------------------------
// Component Props Interfaces
// ---------------------------------------------------------------------------

export interface BaseTableProps<T> {
  t: TFunction;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  selectedIds?: string[];
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: string, checked: boolean) => void;
}

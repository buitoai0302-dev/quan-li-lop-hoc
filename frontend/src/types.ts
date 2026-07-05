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
  onboarding_completed: boolean;
  notify_upcoming_sessions: boolean;
  is_google_connected: boolean;
  tenant_settings?: {
    menu: Record<string, boolean>;
  };
}

export interface WeeklyScheduleData {
  weekStart: string;
  weekEnd: string;
  sessions: import('./types/schemas').Session[];
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
    menu: Record<string, boolean>;
  };
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  price_vnd?: string | number;
  price_usd?: string | number;
  price?: number;
  max_users?: number;
  max_students?: number;
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
  status: string;
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

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'student' | 'class' | 'teacher' | 'session';
}

export interface DashboardStats {
  activeClasses?: number;
  teachers?: number;
  students?: number;
  upcomingSessions?: number;
  enrolledClasses?: number;
  studentTrend?: string;
  classTrend?: string;
  studentTrends?: { month: string; count: number }[];
  classDistribution?: { status: string; count: number }[];
  revenueTrends?: { month: string; expected: number; actual: number }[];
  recentActivities?: ActivityItem[];
  attendanceTrends?: { day: string; rate: number }[];
  overallAttendance?: number;
  plan?: string;
  isGlobal?: boolean;
  tenants?: number;
  usage?: {
    students: { used: number; limit: number };
    classes: { used: number; limit: number };
    branches: { used: number; limit: number };
  };
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

export type ViewMode = 'day' | 'week' | 'month';

// ---------------------------------------------------------------------------
// Component Props Interfaces
// ---------------------------------------------------------------------------

export interface BaseTableProps<T> {
  t: TFunction;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
}

export interface StudentTableProps extends BaseTableProps<import('./types/schemas').Student> {
  students: import('./types/schemas').Student[];
  selectedIds?: string[];
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: string, checked: boolean) => void;
}

export interface TeacherTableProps extends BaseTableProps<import('./types/schemas').Teacher> {
  teachers: import('./types/schemas').Teacher[];
}

export interface BranchTableProps extends BaseTableProps<import('./types/schemas').Branch> {
  branches: import('./types/schemas').Branch[];
}

export interface RoomTableProps extends BaseTableProps<import('./types/schemas').Room> {
  rooms: import('./types/schemas').Room[];
}

export interface ClassTableProps extends BaseTableProps<import('./types/schemas').ClassData> {
  classes: import('./types/schemas').ClassData[];
}

export interface StudentFormProps {
  initialData?: import('./types/schemas').StudentFormData;
  onSubmit: (data: import('./types/schemas').StudentFormData) => void;
  branches: import('./types/schemas').Branch[];
  editingId: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  t: TFunction;
  dobInputRef: React.RefObject<HTMLInputElement | null>;
}

export interface TeacherFormProps {
  initialData?: import('./types/schemas').TeacherFormData;
  onSubmit: (data: import('./types/schemas').TeacherFormData) => void;
  branches: import('./types/schemas').Branch[];
  editingId: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  t: TFunction;
}

export interface BranchFormProps {
  initialData?: import('./types/schemas').BranchFormData;
  onSubmit: (data: import('./types/schemas').BranchFormData) => void;
  isSubmitting: boolean;
  onClose: () => void;
  t: TFunction;
}

export interface RoomFormProps {
  initialData?: import('./types/schemas').RoomFormData;
  onSubmit: (data: import('./types/schemas').RoomFormData) => void;
  branches: import('./types/schemas').Branch[];
  isSubmitting: boolean;
  onClose: () => void;
  t: TFunction;
}

export interface ClassFormProps {
  initialData?: import('./types/schemas').ClassBasicFormData;
  onSubmit: (data: import('./types/schemas').ClassBasicFormData) => void;
  branches: import('./types/schemas').Branch[];
  teachers: import('./types/schemas').Teacher[];
  rooms: import('./types/schemas').Room[];
  allStudents: import('./types/schemas').Student[];
  recurringSchedules: import('./types/schemas').RecurringSchedule[];
  setRecurringSchedules: (schedules: import('./types/schemas').RecurringSchedule[]) => void;
  enrollments: import('./types/schemas').Enrollment[];
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  onEnrollStudent: () => void;
  onUnenrollStudent: (studentId: string) => void;
  onOpenBulkEnroll: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  t: TFunction;
  startDateRef: React.RefObject<HTMLInputElement | null>;
  endDateRef: React.RefObject<HTMLInputElement | null>;
}

export interface ScheduleHeaderProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  branches: import('./types/schemas').Branch[];
  selectedBranch: string;
  setSelectedBranch: (id: string) => void;
  teachers: import('./types/schemas').Teacher[];
  selectedTeacher: string;
  setSelectedTeacher: (id: string) => void;
  classes: import('./types/schemas').ClassData[];
  selectedClass: string;
  setSelectedClass: (id: string) => void;
  isFilterVisible: boolean;
  setIsFilterVisible: (visible: boolean) => void;
  canEdit: boolean;
  onAddSession: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  currentLocale: unknown;
  user: User | null;
  t: TFunction;
}

export interface BulkEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStudents: import('./types/schemas').Student[];
  enrollments: import('./types/schemas').Enrollment[];
  onBulkEnroll: (studentIds: string[]) => void;
  t: TFunction;
}

export interface ProfileSettingsProps {
  fullName: string;
  setFullName: (name: string) => void;
  notifySessions: boolean;
  setNotifySessions: (notify: boolean) => void;
  onSave: () => void;
  saving: boolean;
  t: TFunction;
}

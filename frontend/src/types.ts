import type { TFunction } from 'i18next';

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

export interface Session {
  id: string;
  tenant_id: string;
  class_id: string;
  room_id: string;
  teacher_id: string;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  session_type: string;
  status: string;
  notes?: string;
  class_name?: string;
  teacher_name?: string;
  room_name?: string;
  branch_name?: string;
}

export interface WeeklyScheduleData {
  weekStart: string;
  weekEnd: string;
  sessions: Session[];
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
}

export interface Teacher {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  branch_id?: string;
  branch_name?: string;
  is_active?: boolean;
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  room_type?: string;
  branch_id?: string;
  branch_name?: string;
  is_active?: boolean;
}

export interface ClassData {
  id: string;
  name: string;
  max_capacity: number;
  branch_id: string;
  branch_name?: string;
  teacher_id: string;
  teacher_name?: string;
  subject_id?: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at?: string;
}

export interface Student {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  branch_id?: string;
  branch_name?: string;
  is_active?: boolean;
  parent_phone?: string;
}

export interface Enrollment {
  id: string;
  full_name: string;
  email?: string;
  enrolled_at: string;
}

export interface RecurringSchedule {
  day_of_week: number;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  room_id: string;
  notes?: string;
}

export interface HelpCategory {
  id: string;
  icon: import('react').ReactNode;
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
  price?: number; // Legacy/Public pricing
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

export interface AttendanceRecord {
  student_id: string;
  full_name: string;
  email?: string;
  attendance_id: string | null;
  status: string;
  marked_at: string | null;
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
  label?: string; // For display
}

export interface PlanFeature {
  feature_key: string;
  is_enabled: boolean;
  label?: string; // For display
}

export interface AdminStats {
  totalTenants: number;
  totalUsers: number;
  totalSessions: number;
}

export type ViewMode = 'day' | 'week' | 'month';

// Component Props Interfaces
export interface BaseTableProps<T> {
  t: TFunction;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
}

export interface StudentTableProps extends BaseTableProps<Student> {
  students: Student[];
}

export interface TeacherTableProps extends BaseTableProps<Teacher> {
  teachers: Teacher[];
}

export interface BranchTableProps extends BaseTableProps<Branch> {
  branches: Branch[];
}

export interface RoomTableProps extends BaseTableProps<Room> {
  rooms: Room[];
}

export interface ClassTableProps extends BaseTableProps<ClassData> {
  classes: ClassData[];
}

export type StudentFormData = {
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  branch_id: string;
  is_active: boolean;
  parent_phone?: string;
};

export interface StudentFormProps {
  initialData?: StudentFormData;
  onSubmit: (data: StudentFormData) => void;
  branches: Branch[];
  editingId: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  t: TFunction;
  dobInputRef: React.RefObject<HTMLInputElement | null>;
}

export type TeacherFormData = {
  full_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  branch_id: string;
  is_active: boolean;
};

export interface TeacherFormProps {
  initialData?: TeacherFormData;
  onSubmit: (data: TeacherFormData) => void;
  branches: Branch[];
  editingId: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  t: TFunction;
}

export type BranchFormData = {
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
};

export interface BranchFormProps {
  initialData?: BranchFormData;
  onSubmit: (data: BranchFormData) => void;
  isSubmitting: boolean;
  onClose: () => void;
  t: TFunction;
}

export type RoomFormData = {
  name: string;
  capacity: number;
  room_type: string;
  branch_id: string;
  is_active: boolean;
};

export interface RoomFormProps {
  initialData?: RoomFormData;
  onSubmit: (data: RoomFormData) => void;
  branches: Branch[];
  isSubmitting: boolean;
  onClose: () => void;
  t: TFunction;
}

export type ClassBasicFormData = {
  name: string;
  branch_id: string;
  teacher_id?: string;
  max_capacity?: number;
  start_date?: string;
  end_date?: string;
};

export interface ClassFormProps {
  initialData?: ClassBasicFormData;
  onSubmit: (data: ClassBasicFormData) => void;
  branches: Branch[];
  teachers: Teacher[];
  rooms: Room[];
  allStudents: Student[];
  recurringSchedules: RecurringSchedule[];
  setRecurringSchedules: (schedules: RecurringSchedule[]) => void;
  enrollments: Enrollment[];
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
  branches: Branch[];
  selectedBranch: string;
  setSelectedBranch: (id: string) => void;
  teachers: Teacher[];
  selectedTeacher: string;
  setSelectedTeacher: (id: string) => void;
  classes: ClassData[];
  selectedClass: string;
  setSelectedClass: (id: string) => void;
  isFilterVisible: boolean;
  setIsFilterVisible: (visible: boolean) => void;
  canEdit: boolean;
  onAddSession: () => void;
  currentLocale: unknown;
  user: User | null;
  t: TFunction;
}

export interface BulkEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStudents: Student[];
  enrollments: Enrollment[];
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

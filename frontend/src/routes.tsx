/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import type { LucideIcon } from 'lucide-react';
import type { TFunction } from 'i18next';
import MainLayout from './components/MainLayout';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('./features/auth/components/Login'));
const Register = lazy(() => import('./features/auth/components/Register'));
const VerifyEmail = lazy(() => import('./features/auth/components/VerifyEmail'));
const ForgotPassword = lazy(() => import('./features/auth/components/ForgotPassword'));
const ResetPassword = lazy(() => import('./features/auth/components/ResetPassword'));
const ResendVerification = lazy(() => import('./features/auth/components/ResendVerification'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const Schedule = lazy(() => import('./features/schedule/components/Schedule'));
const Classes = lazy(() => import('./features/classes/components/Classes'));
const Attendance = lazy(() => import('./features/attendance/components/Attendance'));
const Teachers = lazy(() => import('./features/teachers/components/Teachers'));
const Students = lazy(() => import('./features/students/components/Students'));
const Rooms = lazy(() => import('./features/rooms/components/Rooms'));
const Branches = lazy(() => import('./features/branches/components/Branches'));
const Settings = lazy(() => import('./features/settings/components/Settings'));
const ImportData = lazy(() => import('./features/import/components/ImportData'));
const Help = lazy(() => import('./features/help/components/Help'));
const Subscription = lazy(() => import('./features/subscription/components/Subscription'));
const Checkout = lazy(() => import('./features/subscription/components/Checkout'));
const Tuition = lazy(() => import('./features/tuition/components/Tuition'));
const AdminTenants = lazy(() => import('./features/admin/components/AdminTenants'));
const AdminPlans = lazy(() => import('./features/admin/components/AdminPlans'));
const AdminPlanRequests = lazy(() => import('./features/admin/components/AdminPlanRequests'));
const AdminUsers = lazy(() => import('./features/admin/components/AdminUsers')); // Force TS re-check
const AdminSettings = lazy(() => import('./features/admin/components/AdminSettings'));
const ActivityLog = lazy(() => import('./features/admin/components/ActivityLog'));
const Landing = lazy(() => import('./features/landing/index'));
const BillingReturn = lazy(() => import('./features/subscription/components/BillingReturn'));

import { USER_ROLES, ROUTES, PREMIUM_FEATURES } from './utils/constants';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  ClipboardCheck,
  Users,
  UserSquare2,
  MapPin,
  GitBranch,
  FileUp,
  HelpCircle,
  CreditCard,
  Building2,
  MessageSquarePlus,
  Settings as SettingsIcon,
  History,
  ShieldCheck,
  DollarSign,
  UserCog,
} from 'lucide-react';

export interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  isPremium?: boolean;
}

export interface MenuGroup {
  group: string;
  items: MenuItem[];
  roles?: string[];
}

// Centralized Route Configuration
export const appRoutes = [
  {
    path: ROUTES.HOME,
    element: <Landing />,
  },
  {
    path: ROUTES.LOGIN,
    element: <Login />,
  },
  {
    path: ROUTES.REGISTER,
    element: <Register />,
  },
  {
    path: ROUTES.VERIFY_EMAIL,
    element: <VerifyEmail />,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <ForgotPassword />,
  },
  {
    path: ROUTES.RESET_PASSWORD,
    element: <ResetPassword />,
  },
  {
    path: ROUTES.RESEND_VERIFICATION,
    element: <ResendVerification />,
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: <Dashboard />,
      },
      {
        path: ROUTES.SCHEDULE,
        element: <Schedule />,
      },
      {
        path: ROUTES.CLASSES,
        element: (
          <ProtectedRoute
            roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.TEACHER, USER_ROLES.SUPER_ADMIN]}
          >
            <Classes />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.ATTENDANCE,
        element: (
          <ProtectedRoute
            roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.TEACHER, USER_ROLES.SUPER_ADMIN]}
            requirePremium={true}
            featureKey={PREMIUM_FEATURES.ATTENDANCE}
          >
            <Attendance />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.TEACHERS,
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN]}>
            <Teachers />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.STUDENTS,
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN]}>
            <Students />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.ROOMS,
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN]}>
            <Rooms />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.BRANCHES,
        element: (
          <ProtectedRoute
            roles={[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}
            requirePremium={true}
            featureKey={PREMIUM_FEATURES.BRANCHES}
          >
            <Branches />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.IMPORT,
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN]}>
            <ImportData />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.HELP,
        element: (
          <ProtectedRoute
            roles={[
              USER_ROLES.ADMIN,
              USER_ROLES.STAFF,
              USER_ROLES.TEACHER,
              USER_ROLES.STUDENT,
              USER_ROLES.SUPER_ADMIN,
            ]}
          >
            <Help />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.SUBSCRIPTION,
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}>
            <Subscription />
          </ProtectedRoute>
        ),
      },
      {
        path: '/checkout',
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}>
            <Checkout />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.BILLING_RETURN,
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}>
            <BillingReturn />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.TUITION,
        element: (
          <ProtectedRoute
            roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN]}
            requirePremium={true}
            featureKey={PREMIUM_FEATURES.TUITION}
          >
            <Tuition />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_TENANTS,
        element: (
          <ProtectedRoute roles={[USER_ROLES.SUPER_ADMIN]}>
            <AdminTenants />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_REQUESTS,
        element: (
          <ProtectedRoute roles={[USER_ROLES.SUPER_ADMIN]}>
            <AdminPlanRequests />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_PLANS,
        element: (
          <ProtectedRoute roles={[USER_ROLES.SUPER_ADMIN]}>
            <AdminPlans />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_USERS,
        element: (
          <ProtectedRoute roles={[USER_ROLES.SUPER_ADMIN]}>
            <AdminUsers />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_SETTINGS,
        element: (
          <ProtectedRoute roles={[USER_ROLES.SUPER_ADMIN]}>
            <AdminSettings />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.ACTIVITY_LOG,
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN]}>
            <ActivityLog />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.SETTINGS,
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN]}>
            <Settings />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

// Centralized Menu Items Configuration for Sidebar/Header
export const getMenuItems = (t: TFunction, userRole?: string): MenuGroup[] => [
  {
    group: t('menu.groups.main'),
    items: [
      {
        path: ROUTES.DASHBOARD,
        label: t('menu.dashboard'),
        icon: LayoutDashboard,
        roles: [
          USER_ROLES.ADMIN,
          USER_ROLES.STAFF,
          USER_ROLES.TEACHER,
          USER_ROLES.STUDENT,
          USER_ROLES.SUPER_ADMIN,
        ],
      },
      {
        path: ROUTES.SCHEDULE,
        label:
          userRole === USER_ROLES.TEACHER
            ? t('menu.teachingSchedule')
            : userRole === USER_ROLES.STUDENT
              ? t('menu.learningSchedule')
              : t('menu.schedule'),
        icon: Calendar,
        roles: [
          USER_ROLES.ADMIN,
          USER_ROLES.STAFF,
          USER_ROLES.TEACHER,
          USER_ROLES.STUDENT,
          USER_ROLES.SUPER_ADMIN,
        ],
      },
    ],
  },
  {
    group: t('menu.groups.management'),
    items: [
      {
        path: ROUTES.CLASSES,
        label: t('menu.classes'),
        icon: BookOpen,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.TEACHER, USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.STUDENTS,
        label: t('menu.students'),
        icon: Users,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.TEACHERS,
        label: t('menu.teachers'),
        icon: UserSquare2,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.ROOMS,
        label: t('menu.rooms'),
        icon: MapPin,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.ATTENDANCE,
        label: t('menu.attendance'),
        icon: ClipboardCheck,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.TEACHER, USER_ROLES.SUPER_ADMIN],
        isPremium: true,
      },
      {
        path: ROUTES.BRANCHES,
        label: t('menu.branches'),
        icon: GitBranch,
        roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
        isPremium: true,
      },
      {
        path: ROUTES.TUITION,
        label: t('menu.tuition', 'Học phí'),
        icon: DollarSign,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN],
        isPremium: true,
      },
    ],
  },
  {
    group: t('menu.groups.tools'),
    items: [
      {
        path: ROUTES.IMPORT,
        label: t('menu.import'),
        icon: FileUp,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.ACTIVITY_LOG,
        label: t('menu.activities'),
        icon: History,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN],
      },
    ],
  },
  {
    group: t('menu.groups.system'),
    items: [
      {
        path: ROUTES.SUBSCRIPTION,
        label: t('menu.subscription'),
        icon: CreditCard,
        roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.SETTINGS,
        label: t('menu.settings'),
        icon: SettingsIcon,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.HELP,
        label: t('menu.help'),
        icon: HelpCircle,
        roles: [
          USER_ROLES.ADMIN,
          USER_ROLES.STAFF,
          USER_ROLES.TEACHER,
          USER_ROLES.STUDENT,
          USER_ROLES.SUPER_ADMIN,
        ],
      },
    ],
  },
  {
    group: t('menu.groups.admin'),
    roles: [USER_ROLES.SUPER_ADMIN],
    items: [
      {
        path: ROUTES.ADMIN_TENANTS,
        label: t('menu.adminTenants'),
        icon: Building2,
        roles: [USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.ADMIN_REQUESTS,
        label: t('menu.planRequests'),
        icon: MessageSquarePlus,
        roles: [USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.ADMIN_PLANS,
        label: t('menu.adminPlans'),
        icon: ShieldCheck,
        roles: [USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.ADMIN_USERS,
        label: t('menu.users', 'Người dùng'),
        icon: UserCog,
        roles: [USER_ROLES.SUPER_ADMIN],
      },
      {
        path: ROUTES.ADMIN_SETTINGS,
        label: t('menu.systemSettings', 'Cài đặt hệ thống'),
        icon: SettingsIcon,
        roles: [USER_ROLES.SUPER_ADMIN],
      },
    ],
  },
];

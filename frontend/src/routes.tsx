/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import type { LucideIcon } from 'lucide-react';
import type { TFunction } from 'i18next';
import MainLayout from './components/MainLayout';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const VerifyEmail = lazy(() => import('./pages/Auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const ResendVerification = lazy(() => import('./pages/Auth/ResendVerification'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Classes = lazy(() => import('./pages/Classes'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Teachers = lazy(() => import('./pages/Teachers'));
const Students = lazy(() => import('./pages/Students'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Branches = lazy(() => import('./pages/Branches'));
const Settings = lazy(() => import('./pages/Settings'));
const ImportData = lazy(() => import('./pages/ImportData'));
const Help = lazy(() => import('./pages/Help'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Tuition = lazy(() => import('./pages/Tuition/Tuition'));
const AdminTenants = lazy(() => import('./pages/Admin/AdminTenants'));
const AdminPlans = lazy(() => import('./pages/Admin/AdminPlans'));
const AdminPlanRequests = lazy(() => import('./pages/Admin/AdminPlanRequests'));
const ActivityLog = lazy(() => import('./pages/Admin/ActivityLog'));
const Landing = lazy(() => import('./pages/Landing/index'));

import { USER_ROLES, ROUTES } from './utils/constants';
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
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}>
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
        path: ROUTES.TUITION,
        element: (
          <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN]}>
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
        path: ROUTES.ATTENDANCE,
        label: t('menu.attendance'),
        icon: ClipboardCheck,
        roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.TEACHER, USER_ROLES.SUPER_ADMIN],
        isPremium: true,
      },
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
    ],
  },
];

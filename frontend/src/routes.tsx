/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
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
const PrivacyPage = lazy(() =>
  import('./features/landing/LegalPage').then((module) => ({ default: module.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import('./features/landing/LegalPage').then((module) => ({ default: module.TermsPage }))
);
const BillingReturn = lazy(() => import('./features/subscription/components/BillingReturn'));

import { USER_ROLES, ROUTES, PREMIUM_FEATURES } from './utils/constants';
// Centralized Route Configuration
export const appRoutes = [
  {
    path: ROUTES.HOME,
    element: <Landing />,
  },
  { path: ROUTES.PRIVACY, element: <PrivacyPage /> },
  { path: ROUTES.TERMS, element: <TermsPage /> },
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

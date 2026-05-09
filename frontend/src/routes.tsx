import { Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ResendVerification from './pages/ResendVerification';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import Teachers from './pages/Teachers';
import Students from './pages/Students';
import Rooms from './pages/Rooms';
import Branches from './pages/Branches';
import Settings from './pages/Settings';
import ImportData from './pages/ImportData';
import Help from './pages/Help';
import Subscription from './pages/Subscription';
import AdminTenants from './pages/AdminTenants';
import AdminPlans from './pages/AdminPlans';
import AdminPlanRequests from './pages/AdminPlanRequests';
import ActivityLog from './pages/ActivityLog';
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
  ShieldCheck
} from 'lucide-react';

// Centralized Route Configuration
export const appRoutes = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/verify-email",
    element: <VerifyEmail />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/resend-verification",
    element: <ResendVerification />,
  },
  {
    path: "/",
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      {
        index: true,
        element: <Navigate to="/schedule" replace />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "schedule",
        element: <Schedule />,
      },
      {
        path: "classes",
        element: <ProtectedRoute roles={['admin', 'staff', 'teacher', 'super_admin']}><Classes /></ProtectedRoute>,
      },
      {
        path: "attendance",
        element: <ProtectedRoute roles={['admin', 'staff', 'teacher', 'super_admin']}><Attendance /></ProtectedRoute>,
      },
      {
        path: "teachers",
        element: <ProtectedRoute roles={['admin', 'staff', 'super_admin']}><Teachers /></ProtectedRoute>,
      },
      {
        path: "students",
        element: <ProtectedRoute roles={['admin', 'staff', 'super_admin']}><Students /></ProtectedRoute>,
      },
      {
        path: "rooms",
        element: <ProtectedRoute roles={['admin', 'staff', 'super_admin']}><Rooms /></ProtectedRoute>,
      },
      {
        path: "branches",
        element: <ProtectedRoute roles={['admin', 'super_admin']}><Branches /></ProtectedRoute>,
      },
      {
        path: "import",
        element: <ProtectedRoute roles={['admin', 'staff', 'super_admin']}><ImportData /></ProtectedRoute>,
      },
      {
        path: "help",
        element: <ProtectedRoute roles={['admin', 'staff', 'teacher', 'student', 'super_admin']}><Help /></ProtectedRoute>,
      },
      {
        path: "subscription",
        element: <ProtectedRoute roles={['admin', 'super_admin']}><Subscription /></ProtectedRoute>,
      },
      {
        path: "admin/tenants",
        element: <ProtectedRoute roles={['super_admin']}><AdminTenants /></ProtectedRoute>,
      },
      {
        path: "admin/requests",
        element: <ProtectedRoute roles={['super_admin']}><AdminPlanRequests /></ProtectedRoute>,
      },
      {
        path: "admin/plans",
        element: <ProtectedRoute roles={['super_admin']}><AdminPlans /></ProtectedRoute>,
      },
      {
        path: "activities",
        element: <ProtectedRoute roles={['admin', 'staff', 'super_admin']}><ActivityLog /></ProtectedRoute>,
      },
      {
        path: "settings",
        element: <ProtectedRoute roles={['admin', 'staff', 'super_admin']}><Settings /></ProtectedRoute>,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
];

// Centralized Menu Items Configuration for Sidebar/Header
export const getMenuItems = (t: any, userRole?: string) => [
  { 
    path: '/dashboard', 
    label: t('menu.dashboard'), 
    icon: LayoutDashboard,
    roles: ['admin', 'staff', 'teacher', 'student', 'super_admin']
  },
  { 
    path: '/schedule', 
    label: userRole === 'teacher' ? t('menu.teachingSchedule') : (userRole === 'student' ? t('menu.learningSchedule') : t('menu.schedule')), 
    icon: Calendar,
    roles: ['admin', 'staff', 'teacher', 'student', 'super_admin']
  },
  { 
    path: '/attendance', 
    label: t('menu.attendance'), 
    icon: ClipboardCheck,
    roles: ['admin', 'staff', 'teacher', 'super_admin'],
    isPremium: true
  },
  { 
    path: '/classes', 
    label: t('menu.classes'), 
    icon: BookOpen,
    roles: ['admin', 'staff', 'teacher', 'super_admin']
  },
  { 
    path: '/students', 
    label: t('menu.students'), 
    icon: Users,
    roles: ['admin', 'staff', 'super_admin']
  },
  { 
    path: '/teachers', 
    label: t('menu.teachers'), 
    icon: UserSquare2,
    roles: ['admin', 'staff', 'super_admin']
  },
  { 
    path: '/rooms', 
    label: t('menu.rooms'), 
    icon: MapPin,
    roles: ['admin', 'staff', 'super_admin']
  },
  { 
    path: '/branches', 
    label: t('menu.branches'), 
    icon: GitBranch,
    roles: ['admin', 'super_admin'],
    isPremium: true
  },
  { 
    path: '/import', 
    label: t('menu.import'), 
    icon: FileUp,
    roles: ['admin', 'staff', 'super_admin']
  },
  { 
    path: '/help', 
    label: t('menu.help'), 
    icon: HelpCircle,
    roles: ['admin', 'staff', 'teacher', 'student', 'super_admin']
  },
  { 
    path: '/subscription', 
    label: t('menu.subscription'), 
    icon: CreditCard,
    roles: ['admin', 'super_admin']
  },
  { 
    path: '/settings', 
    label: t('menu.settings'), 
    icon: SettingsIcon,
    roles: ['admin', 'staff', 'super_admin']
  },
  { 
    path: '/admin/tenants', 
    label: t('menu.adminTenants'), 
    icon: Building2,
    roles: ['super_admin']
  },
  { 
    path: '/admin/requests', 
    label: t('menu.planRequests'), 
    icon: MessageSquarePlus,
    roles: ['super_admin']
  },
  { 
    path: '/admin/plans', 
    label: t('menu.adminPlans'), 
    icon: ShieldCheck,
    roles: ['super_admin']
  },
  { 
    path: '/activities', 
    label: t('menu.activities', 'Hoạt động'), 
    icon: History,
    roles: ['admin', 'staff', 'super_admin']
  },
];

import type { LucideIcon } from 'lucide-react';
import type { TFunction } from 'i18next';
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

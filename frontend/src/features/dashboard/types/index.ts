export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: string;
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

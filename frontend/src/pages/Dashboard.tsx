import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import OnboardingModal from '../components/OnboardingModal';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import {
  Users,
  BookOpen,
  TrendingUp,
  PieChart as PieChartIcon,
  Crown,
  Calendar,
  Activity,
  Zap,
  Star,
  Clock,
  ChevronRight,
  MoreHorizontal,
  Building,
  Plus
} from 'lucide-react';
import { TENANT_STATUS, PLAN_CODES, USER_ROLES, ACTIVITY_TYPES } from '../utils/constants';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import type { DashboardStats } from '../types';



import ShortcutButton from './Dashboard/components/ShortcutButton';
import QuickStat from './Dashboard/components/QuickStat';
import UsageBar from './Dashboard/components/UsageBar';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'6months' | 'yearly'>('6months');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      [TENANT_STATUS.ACTIVE]: t('common.active'),
      [TENANT_STATUS.PENDING]: t('common.pending'),
      [TENANT_STATUS.SUSPENDED]: t('common.inactive'),
      completed: t('common.completed')
    };
    return labels[status] || status;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case ACTIVITY_TYPES.STUDENT: return <Users size={14} />;
      case ACTIVITY_TYPES.CLASS: return <BookOpen size={14} />;
      case ACTIVITY_TYPES.SESSION: return <Calendar size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: i18n.language === 'vi' ? vi : enUS
      });
    } catch (e) {
      return dateStr;
    }
  };

  useEffect(() => {
    if (user && !user.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await api.get(`/dashboard/stats?period=${chartPeriod}`);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [chartPeriod]);

  const planCode = stats?.plan?.toUpperCase() || PLAN_CODES.FREE;
  const isFree = planCode === PLAN_CODES.FREE && user?.role === USER_ROLES.ADMIN;
  const canViewYearly = [PLAN_CODES.BUSINESS, PLAN_CODES.ENTERPRISE, 'SUPER ADMIN'].includes(planCode) || user?.role === USER_ROLES.SUPER_ADMIN;
  const displayPlan = planCode;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={24} className="text-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto custom-scrollbar px-3 sm:px-4 py-3">
      <div className="space-y-4 animate-in fade-in duration-700 pb-6 max-w-7xl mx-auto">
      <div className="relative bg-gradient-to-br from-gray-900 to-indigo-950 rounded-2xl p-6 md:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black tracking-widest mb-4">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span>{t(`admin.planNames.${displayPlan.toUpperCase()}`, displayPlan)}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              {t('dashboard.welcome')}, {user?.full_name?.split(' ').pop()}!
            </h1>
            <p className="text-white/50 text-sm md:text-base max-w-md leading-relaxed">
              {t('dashboard.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <ShortcutButton 
          icon={<Calendar size={18} />} 
          label={user?.role === USER_ROLES.TEACHER ? t('menu.teachingSchedule') : (user?.role === USER_ROLES.STUDENT ? t('menu.learningSchedule') : t('schedule.title'))} 
          onClick={() => navigate('/schedule')} 
          color="amber" 
        />

        {[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.TEACHER, USER_ROLES.SUPER_ADMIN].includes(user?.role || '') && (
          <ShortcutButton 
            icon={<BookOpen size={18} />} 
            label={t('menu.classes')} 
            onClick={() => navigate('/classes')} 
            color="emerald" 
          />
        )}

        {[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN].includes(user?.role || '') && (
          <>
            <ShortcutButton 
              icon={<Plus size={18} />} 
              label={t('students.addStudent')} 
              onClick={() => navigate('/students')} 
              color="indigo" 
            />
            <ShortcutButton 
              icon={<Users size={18} />} 
              label={t('teachers.addTeacher')} 
              onClick={() => navigate('/teachers')} 
              color="rose" 
            />
          </>
        )}

        {[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.role || '') && (
          <ShortcutButton 
            icon={<Building size={18} />} 
            label={t('branches.addBranch')} 
            onClick={() => navigate('/branches')} 
            color="indigo" 
          />
        )}

        {[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN].includes(user?.role || '') && (
          <ShortcutButton 
            icon={<Activity size={18} />} 
            label={t('dashboard.liveFeed')} 
            onClick={() => navigate('/activities')} 
            color="gray" 
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === USER_ROLES.STUDENT ? (
          <>
            <QuickStat
              icon={<BookOpen size={18} />}
              label={t('dashboard.enrolledClasses')}
              value={stats?.enrolledClasses || 0}
              trend={t('common.active')}
              color="emerald"
            />
            <QuickStat
              icon={<Calendar size={18} />}
              label={t('dashboard.upcomingSessions')}
              value={stats?.upcomingSessions || 0}
              trend={t('dashboard.thisWeek')}
              color="amber"
            />
          </>
        ) : user?.role === USER_ROLES.TEACHER ? (
          <>
            <QuickStat
              icon={<BookOpen size={18} />}
              label={t('dashboard.activeClasses')}
              value={stats?.activeClasses || 0}
              trend={t('common.active')}
              color="emerald"
            />
            <QuickStat
              icon={<Users size={18} />}
              label={t('dashboard.students')}
              value={stats?.students || 0}
              trend={t('common.active')}
              color="indigo"
            />
            <QuickStat
              icon={<Calendar size={18} />}
              label={t('dashboard.upcomingSessions')}
              value={stats?.upcomingSessions || 0}
              trend={t('dashboard.thisWeek')}
              color="amber"
            />
          </>
        ) : (
          <>
            <QuickStat
              icon={<Users size={18} />}
              label={t('dashboard.students')}
              value={stats?.students || 0}
              trend={stats?.studentTrend || '—'}
              color="indigo"
            />
            <QuickStat
              icon={<BookOpen size={18} />}
              label={t('dashboard.activeClasses')}
              value={stats?.activeClasses || 0}
              trend={stats?.classTrend || '—'}
              color="emerald"
            />
            <QuickStat
              icon={<Calendar size={18} />}
              label={t('dashboard.upcomingSessions')}
              value={stats?.upcomingSessions || 0}
              trend={t('dashboard.thisWeek')}
              color="amber"
            />
            <QuickStat
              icon={stats?.isGlobal ? <Building size={18} /> : <Crown size={18} />}
              label={stats?.isGlobal ? t('admin.tenantsTitle') : t('admin.plan')}
              value={stats?.isGlobal ? (stats?.tenants || 0) : t(`admin.planNames.${displayPlan.toUpperCase()}`, displayPlan)}
              trend={t('common.active')}
              color="indigo"
            />
          </>
        )}
      </div>

      {[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN].includes(user?.role || '') ? (
        <div className="relative min-h-[600px]">
          <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 transition-all duration-700 ${isFree ? 'blur-[12px] grayscale opacity-40 pointer-events-none select-none' : ''}`}>
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/20 dark:shadow-none overflow-hidden relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="text-indigo-500" size={20} />
                      {t('dashboard.studentGrowth')}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{t('dashboard.forecastNote')}</p>
                  </div>
                  <div className="flex bg-gray-50 dark:bg-gray-900/50 p-1 rounded-lg">
                    <button
                      onClick={() => canViewYearly && setChartPeriod('yearly')}
                      disabled={!canViewYearly}
                      className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${!canViewYearly
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : chartPeriod === 'yearly'
                          ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600'
                          : 'text-gray-400 hover:text-gray-600'
                        }`}
                      title={!canViewYearly ? t('dashboard.yearlyLocked') : ''}
                    >
                      {!canViewYearly && <Zap size={10} className="text-amber-400" />}
                      {t('dashboard.yearly')}
                    </button>
                    <button
                      onClick={() => setChartPeriod('6months')}
                      className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${chartPeriod === '6months'
                        ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      {t('dashboard.last6Months')}
                    </button>
                  </div>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={(stats?.studentTrends || []).map(t => ({
                      ...t,
                      monthLabel: new Date(Date.parse(t.month + " 1, 2024")).toLocaleDateString(i18n.language, { month: 'short' })
                    }))}>
                      <defs>
                        <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#areaColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user?.tenant_settings?.menu?.attendance !== false && (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg shadow-gray-200/20 dark:shadow-none relative overflow-hidden">
                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                      <Activity className="text-emerald-500" size={18} />
                      {t('dashboard.attendanceHeatmap')}
                    </h3>
                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.attendanceTrends || []}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <Tooltip cursor={{ fill: 'transparent' }} />
                          <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={20}>
                            {(stats?.attendanceTrends || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.rate > 80 ? '#10B981' : '#6366F1'} fillOpacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg shadow-gray-200/20 dark:shadow-none relative overflow-hidden">
                  <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                    <PieChartIcon className="text-amber-500" size={18} />
                    {t('dashboard.classDistribution')}
                  </h3>
                  <div className="h-[180px] w-full flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(stats?.classDistribution || []).map(d => ({ ...d, label: getStatusLabel(d.status) }))}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="label"
                        >
                          {(stats?.classDistribution || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 shrink-0">
                      {(stats?.classDistribution || []).map((entry, index) => (
                        <div key={entry.status} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{getStatusLabel(entry.status)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {[USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.SUPER_ADMIN].includes(user?.role || '') && (
                <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl p-7 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-none relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Zap size={16} className="text-primary" />
                    {t('dashboard.usageQuota')}
                  </h3>
                  <div className="space-y-5">
                    <UsageBar
                      label={t('dashboard.studentsLimit')}
                      used={stats?.usage?.students.used || 0}
                      limit={stats?.usage?.students.limit || 0}
                    />
                    <UsageBar
                      label={t('dashboard.classesLimit')}
                      used={stats?.usage?.classes.used || 0}
                      limit={stats?.usage?.classes.limit || 0}
                    />
                    <UsageBar
                      label={t('dashboard.branchesLimit')}
                      used={stats?.usage?.branches.used || 0}
                      limit={stats?.usage?.branches.limit || 0}
                    />
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/20 dark:shadow-none relative overflow-hidden flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="text-primary animate-pulse" size={18} />
                    {t('dashboard.liveFeed')}
                  </h3>
                  <MoreHorizontal size={18} className="text-gray-300" />
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5">
                  {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                    stats.recentActivities.map((act, i) => (
                      <div key={i} className="flex gap-3 group">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-primary/60 group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                          {getActivityIcon(act.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 dark:text-white leading-snug">
                            {act.user} <span className="font-medium text-gray-500">{act.action}</span>
                          </p>
                          <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-0.5 uppercase font-black">
                            <Clock size={10} />
                            {getTimeAgo(act.time)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-300 text-xs italic">
                      {t('dashboard.noActivity')}
                    </div>
                  )}
                </div>
                {!isFree && (stats?.recentActivities?.length || 0) > 0 && (
                  <button
                    onClick={() => navigate('/activities')}
                    className="w-full mt-4 py-3 bg-gray-50 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                  >
                    {t('dashboard.viewAllEvents')} <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {isFree && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-white/5 dark:bg-gray-900/5 backdrop-blur-[12px]">
              <div className="bg-white/95 dark:bg-gray-800/95 p-12 rounded-2xl shadow-2xl border border-white/20 max-w-md text-center animate-in zoom-in-95 duration-500 shadow-primary/20">
                <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-8 text-white shadow-xl shadow-amber-500/30">
                  <Crown size={40} fill="currentColor" />
                </div>
                <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-4 italic tracking-tight">
                  {t('dashboard.upgradeTitle')}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
                  {t('dashboard.upgradeDescFull')}
                </p>
                <button
                  onClick={() => navigate('/subscription')}
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-700 hover:to-primary-dark text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/30 transition-all active:scale-95"
                >
                  {t('dashboard.unlockNow')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 px-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
            <Calendar size={40} />
          </div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
            {t('dashboard.readyToTeach')}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            {t('dashboard.teacherWelcomeDesc')}
          </p>
          <button
            onClick={() => navigate('/schedule')}
            className="px-10 py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            {user?.role === USER_ROLES.TEACHER ? t('menu.teachingSchedule') : t('menu.learningSchedule')}
          </button>
        </div>
      )}

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        userName={user?.full_name || ''}
      />
    </div>
  </div>
  );
};

export default Dashboard;

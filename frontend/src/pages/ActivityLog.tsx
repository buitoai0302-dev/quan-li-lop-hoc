import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import {
  Activity,
  Users,
  BookOpen,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'student' | 'class' | 'teacher' | 'session';
}

const ActivityLog: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const fetchActivities = async (page: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/activities?page=${page}&limit=20`);
      setActivities(res.data.activities);
      setPagination({
        page: res.data.pagination.page,
        totalPages: res.data.pagination.totalPages
      });
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(1);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'student': return <Users size={18} className="text-indigo-500" />;
      case 'class': return <BookOpen size={18} className="text-emerald-500" />;
      case 'teacher': return <UserCheck size={18} className="text-amber-500" />;
      case 'session': return <Calendar size={18} className="text-rose-500" />;
      default: return <Activity size={18} className="text-gray-500" />;
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader 
        icon={Activity}
      />

      <div className="flex-1 w-full overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12 sm:p-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary"></div>
          </div>
        ) : activities.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-50 dark:divide-gray-700/50">
              {activities.map((act) => (
                <div key={act.id} className="p-3 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors flex gap-3 sm:gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight break-words">
                        <span className="text-primary">{act.user}</span> {act.action} <span className="text-gray-400">{act.target}</span>
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 uppercase font-black shrink-0">
                        <Clock size={10} />
                        {getTimeAgo(act.time)}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      {t(`common.${act.type}`, act.type)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                {t('common.page')} {pagination.page} / {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchActivities(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => fetchActivities(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState 
            title={t('dashboard.noActivity')}
            icon={Activity}
          />
        )}
      </div>
    </div>
  );
};

export default ActivityLog;

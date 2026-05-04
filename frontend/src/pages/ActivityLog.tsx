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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Activity size={28} />
            </div>
            {t('dashboard.activityLog', 'Nhật ký hoạt động')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t('dashboard.activityLogDesc', 'Theo dõi toàn bộ thay đổi và hoạt động quan trọng trong hệ thống.')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
          </div>
        ) : activities.length > 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {activities.map((act, index) => (
              <div key={act.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors flex gap-5 group">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {getActivityIcon(act.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed">
                      <span className="text-primary">{act.user}</span> {act.action} <span className="text-gray-400">{act.target}</span>
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-black shrink-0">
                      <Clock size={12} />
                      {getTimeAgo(act.time)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    {t(`common.${act.type}`, act.type)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center text-gray-400 italic">
            {t('dashboard.noActivity', 'Không có hoạt động nào.')}
          </div>
        )}

        {/* Pagination */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            {t('common.page', 'Trang')} {pagination.page} / {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchActivities(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => fetchActivities(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Clock, Activity, Users, BookOpen, Calendar, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import type { ActivityItem } from '../types';



const NotificationPopover: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/activities?page=1&limit=5');
      setActivities(res.data.activities);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'student': return <Users size={14} className="text-indigo-500" />;
      case 'class': return <BookOpen size={14} className="text-emerald-500" />;
      case 'session': return <Calendar size={14} className="text-rose-500" />;
      default: return <Activity size={14} className="text-gray-500" />;
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
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all active:scale-95 shadow-sm group"
        title="Notifications"
      >
        <Bell size={18} className={`transition-colors ${isOpen ? 'text-primary' : 'text-gray-600 dark:text-gray-400 group-hover:text-primary'}`} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></span>
      </button>

      {isOpen && (
        <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto sm:right-0 mt-3 sm:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              {t('dashboard.liveFeed')}
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/20 border-t-primary"></div>
              </div>
            ) : activities.length > 0 ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {activities.map((act) => (
                  <div key={act.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors flex gap-3 group cursor-pointer" onClick={() => { setIsOpen(false); navigate('/activities'); }}>
                    <div className="w-8 h-8 rounded-md bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      {getActivityIcon(act.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-gray-800 dark:text-white leading-snug">
                        {act.user} <span className="font-medium text-gray-500">{act.action}</span> <span className="text-gray-400">{act.target}</span>
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-1 uppercase font-black">
                        <Clock size={10} />
                        {getTimeAgo(act.time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-gray-400 text-[10px] italic">
                {t('dashboard.noActivity')}
              </div>
            )}
          </div>

          <button
            onClick={() => { setIsOpen(false); navigate('/activities'); }}
            className="w-full py-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all flex items-center justify-center gap-2"
          >
            {t('dashboard.viewAllEvents')} <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPopover;

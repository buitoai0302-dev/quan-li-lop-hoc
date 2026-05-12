import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { TENANT_STATUS, ACTIVITY_TYPES } from '@/utils/constants';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

import { Users, BookOpen, Calendar, Activity } from 'lucide-react';

export const useDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [chartPeriod, setChartPeriod] = useState<'6months' | 'yearly'>('6months');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && !user.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [user]);

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', chartPeriod],
    queryFn: () => getDashboardStats(chartPeriod),
    staleTime: 5 * 60 * 1000,
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      [TENANT_STATUS.ACTIVE]: t('common.active'),
      [TENANT_STATUS.PENDING]: t('common.pending'),
      [TENANT_STATUS.SUSPENDED]: t('common.inactive'),
      completed: t('common.completed'),
    };
    return labels[status] || status;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case ACTIVITY_TYPES.STUDENT:
        return <Users size={14} />;
      case ACTIVITY_TYPES.CLASS:
        return <BookOpen size={14} />;
      case ACTIVITY_TYPES.SESSION:
        return <Calendar size={14} />;
      default:
        return <Activity size={14} />;
    }
  };
  // Actually, Dashboard.tsx uses icons from lucide-react directly in the helper.
  // I should probably return the icons if I import them here, or keep the helper in Dashboard.tsx.
  // But FSD prefers business logic in hooks.

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: i18n.language === 'vi' ? vi : enUS,
      });
    } catch (e) {
      return dateStr;
    }
  };

  return {
    stats: statsQuery.data,
    loading: statsQuery.isLoading,
    chartPeriod,
    setChartPeriod,
    showOnboarding,
    setShowOnboarding,
    getStatusLabel,
    getActivityIcon, // Note: Dashboard.tsx might need adjustment if it expects React components
    getTimeAgo,
  };
};

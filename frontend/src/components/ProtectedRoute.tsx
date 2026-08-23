import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../utils/constants';

import { Crown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { USER_ROLES } from '@/utils/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  requirePremium?: boolean;
  featureKey?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles,
  requirePremium,
  featureKey,
}) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Check role-based access
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Check premium access
  if (requirePremium && featureKey) {
    const isEnabled = user.plan_features?.[featureKey] === true;
    if (user.role !== USER_ROLES.SUPER_ADMIN && !isEnabled) {
      return (
        <div className="h-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-gradient-to-tr from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-orange-500/10 border border-orange-200/50 dark:border-orange-500/20">
            <Crown className="w-12 h-12 text-orange-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            {t('premium.title', 'Tính năng Premium')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
            {t(
              'premium.description',
              'Gói hiện tại của bạn không hỗ trợ tính năng này. Vui lòng nâng cấp gói để mở khóa toàn bộ sức mạnh của EduSchedule.'
            )}
          </p>
          <Link
            to={ROUTES.SUBSCRIPTION}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <span>{t('premium.upgradeBtn', 'Nâng cấp ngay')}</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      );
    }
  }

  return <>{children}</>;
};

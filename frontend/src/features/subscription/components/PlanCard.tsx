import React from 'react';
import { Building, Zap, Shield, Crown, Layout, Users, Check } from 'lucide-react';
import type { TFunction } from 'i18next';
import { PLAN_CODES } from '@/utils/constants';
import type { Plan, PlanFeature, PlanLimit } from '@/types';

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  isVi: boolean;
  isSubmitting: boolean;
  pendingPlanId: string | null;
  onUpgrade: (planId: string, planName: string) => void;
  t: TFunction;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrent,
  isVi,
  isSubmitting,
  pendingPlanId,
  onUpgrade,
  t,
}) => {
  const isFree = plan.code === PLAN_CODES.FREE;
  const isPro = plan.code === PLAN_CODES.PRO;
  const isBusiness = plan.code === PLAN_CODES.BUSINESS;
  const isEnterprise = plan.code === PLAN_CODES.ENTERPRISE;

  const getLimitValue = (plan: Plan, key: string) => {
    if (!Array.isArray(plan.limits)) return 0;
    const limit = (plan.limits as PlanLimit[]).find((l) => l.limit_key === key);
    if (!limit) return 0;
    return limit.limit_value === -1 ? '∞' : limit.limit_value;
  };

  const hasFeature = (plan: Plan, key: string) => {
    if (!Array.isArray(plan.features)) return false;
    return (plan.features as PlanFeature[]).find((f) => f.feature_key === key)?.is_enabled || false;
  };

  return (
    <div
      className={`relative flex flex-col p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-3xl border transition-all duration-500 group ${
        isCurrent
          ? 'border-primary ring-4 ring-primary/5 shadow-2xl lg:scale-[1.02] z-10'
          : 'border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      {isCurrent && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black px-5 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
          {t('subscription.currentPlan')}
        </div>
      )}

      <div className="flex justify-between items-start mb-8">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
            isFree
              ? 'bg-gray-100 text-gray-400'
              : isPro
                ? 'bg-blue-500 text-white shadow-blue-500/20'
                : isBusiness
                  ? 'bg-purple-600 text-white shadow-purple-600/20'
                  : 'bg-amber-500 text-white shadow-amber-500/20'
          }`}
        >
          {isFree && <Building size={24} />}
          {isPro && <Zap size={24} fill="currentColor" />}
          {isBusiness && <Shield size={24} fill="currentColor" />}
          {isEnterprise && <Crown size={24} fill="currentColor" />}
        </div>
        {!isFree && (
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest">
            {t('subscription.popular')}
          </span>
        )}
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight uppercase">
          {plan.name}
        </h3>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1 whitespace-nowrap flex-nowrap">
            <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter shrink-0">
              {isVi
                ? new Intl.NumberFormat('vi-VN').format(Number(plan.price_vnd) || 0)
                : plan.price_usd}
            </span>
            <span className="text-lg font-black text-gray-900 dark:text-white shrink-0">
              {isVi ? 'đ' : '$'}
            </span>
            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1 shrink-0">
              /{t('common.month')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-8 mb-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2 uppercase tracking-tight">
              <Building size={16} className="text-primary opacity-60" />{' '}
              {t('admin.limitLabels.max_branches')}
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white">
              {getLimitValue(plan, 'max_branches')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2 uppercase tracking-tight">
              <Layout size={16} className="text-primary opacity-60" />{' '}
              {t('admin.limitLabels.max_classes')}
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white">
              {getLimitValue(plan, 'max_classes')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2 uppercase tracking-tight">
              <Users size={16} className="text-primary opacity-60" />{' '}
              {t('admin.limitLabels.max_teachers')}
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white">
              {getLimitValue(plan, 'max_teachers')}
            </span>
          </div>
        </div>

        <div className="h-px bg-gray-50 dark:bg-gray-700/50 w-full" />

        <ul className="space-y-4">
          <li
            className={`flex items-center gap-3 text-xs font-bold transition-colors ${hasFeature(plan, 'multi_branch') ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hasFeature(plan, 'multi_branch') ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}
            >
              <Check size={12} strokeWidth={4} />
            </div>
            {t('admin.featureLabels.multi_branch')}
          </li>
          <li
            className={`flex items-center gap-3 text-xs font-bold transition-colors ${hasFeature(plan, 'advanced_reports') ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hasFeature(plan, 'advanced_reports') ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}
            >
              <Check size={12} strokeWidth={4} />
            </div>
            {t('admin.featureLabels.advanced_reports')}
          </li>
          <li
            className={`flex items-center gap-3 text-xs font-bold transition-colors ${hasFeature(plan, 'api_access') ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hasFeature(plan, 'api_access') ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}
            >
              <Check size={12} strokeWidth={4} />
            </div>
            {t('admin.featureLabels.api_access')}
          </li>
        </ul>
      </div>

      <button
        disabled={isCurrent || isSubmitting || plan.id === pendingPlanId}
        onClick={() => onUpgrade(plan.id, plan.name)}
        className={`w-full py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${
          isCurrent || isSubmitting || plan.id === pendingPlanId
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default shadow-none'
            : 'bg-primary text-white hover:bg-primary-dark hover:scale-[1.02] active:scale-95 shadow-primary/20'
        }`}
      >
        {isSubmitting
          ? t('common.sending')
          : plan.id === pendingPlanId
            ? t('subscription.pending')
            : isCurrent
              ? t('subscription.current')
              : isFree
                ? t('subscription.downgrade')
                : t('subscription.upgrade')}
      </button>
    </div>
  );
};

export default PlanCard;

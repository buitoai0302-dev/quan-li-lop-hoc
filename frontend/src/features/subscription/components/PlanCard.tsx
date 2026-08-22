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
  billingCycle: 'MONTHLY' | 'YEARLY';
  onUpgrade: (planId: string, planName: string) => void;
  t: TFunction;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrent,
  isVi,
  isSubmitting,
  pendingPlanId,
  billingCycle,
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

  const monthlyPrice = isVi ? Number(plan.price_vnd) || 0 : Number(plan.price_usd) || 0;
  const yearlyPrice = isVi
    ? Number(plan.yearly_price_vnd) || 0
    : Number(plan.yearly_price_usd) || 0;
  const isYearly = billingCycle === 'YEARLY';
  const displayPrice = isYearly ? yearlyPrice : monthlyPrice;

  // Tự động tính toán mức tiết kiệm
  let discountPercentage = 0;
  if (isYearly && monthlyPrice > 0 && yearlyPrice > 0) {
    const totalMonthlyCost = monthlyPrice * 12;
    if (totalMonthlyCost > yearlyPrice) {
      discountPercentage = Math.round(((totalMonthlyCost - yearlyPrice) / totalMonthlyCost) * 100);
    }
  }

  // Giá hiển thị phụ nếu là năm thì chia 12 ra để so sánh
  const monthlyEquivalent = isYearly && yearlyPrice > 0 ? Math.round(yearlyPrice / 12) : 0;

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
        <div className="flex justify-between items-end mb-2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
            {plan.name}
          </h3>
          {discountPercentage > 0 && (
            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black">
              -{discountPercentage}%
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1 whitespace-nowrap flex-nowrap overflow-hidden">
            <span className="text-3xl xl:text-4xl font-black text-gray-900 dark:text-white tracking-tighter shrink-0 truncate">
              {isVi
                ? new Intl.NumberFormat('vi-VN').format(
                    isYearly && yearlyPrice > 0 ? monthlyEquivalent : displayPrice
                  )
                : isYearly && yearlyPrice > 0
                  ? (yearlyPrice / 12).toFixed(2)
                  : displayPrice}
            </span>
            <span className="text-lg font-black text-gray-900 dark:text-white shrink-0">
              {isVi ? 'đ' : '$'}
            </span>
            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1 shrink-0">
              /{t('common.month')}
            </span>
          </div>
          {isYearly && monthlyPrice > 0 && (
            <div className="text-[11px] text-gray-400 font-medium mt-1 flex items-center gap-1">
              Thanh toán{' '}
              <span className="font-bold text-gray-600 dark:text-gray-300">
                {isVi ? new Intl.NumberFormat('vi-VN').format(yearlyPrice) : yearlyPrice}
                {isVi ? 'đ' : '$'}
              </span>{' '}
              / năm
            </div>
          )}
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

      {isSubmitting || plan.id === pendingPlanId || isCurrent ? (
        <button
          disabled
          className={`w-full py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default shadow-none`}
        >
          {isSubmitting
            ? t('common.sending')
            : plan.id === pendingPlanId
              ? t('subscription.pending')
              : t('subscription.current')}
        </button>
      ) : isFree ? (
        <button
          onClick={() => onUpgrade(plan.id, plan.name)}
          className="w-full py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl bg-primary text-white hover:bg-primary-dark hover:scale-[1.02] active:scale-95 shadow-primary/20"
        >
          {t('subscription.downgrade')}
        </button>
      ) : (
        <button
          onClick={() => onUpgrade(plan.id, plan.name)}
          className="w-full py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl bg-primary text-white hover:bg-primary-dark hover:scale-[1.02] active:scale-95 shadow-primary/20"
        >
          {t('subscription.upgrade')}
        </button>
      )}
    </div>
  );
};

export default PlanCard;

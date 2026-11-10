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
  isSignupSelection?: boolean;
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
  isSignupSelection,
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
      className={`flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6 ${
        isCurrent
          ? 'border-primary ring-1 ring-primary/20'
          : isSignupSelection
            ? 'border-indigo-500 ring-1 ring-indigo-500/20'
            : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {isSignupSelection && !isCurrent && (
        <p className="mb-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
          {t('landing.selectedPlan', 'Gói đã chọn')}
        </p>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
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
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {plan.name}
          </h3>
          {isCurrent && (
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {t('subscription.currentPlan')}
            </span>
          )}
        </div>
        {discountPercentage > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            -{discountPercentage}%
          </span>
        )}
      </div>

      <div className="mb-5">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-baseline gap-x-1">
            <span className="min-w-0 break-words text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
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
            <span className="ml-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              /{t('common.month')}
            </span>
          </div>
          {isYearly && monthlyPrice > 0 && (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-1 text-xs text-slate-600 dark:text-slate-300">
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

      <div className="mb-5 flex-1 space-y-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Building size={16} className="shrink-0 text-indigo-600 dark:text-indigo-300" />{' '}
              {t('admin.limitLabels.max_branches')}
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white">
              {getLimitValue(plan, 'max_branches')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Layout size={16} className="shrink-0 text-indigo-600 dark:text-indigo-300" />{' '}
              {t('admin.limitLabels.max_classes')}
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white">
              {getLimitValue(plan, 'max_classes')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Users size={16} className="shrink-0 text-indigo-600 dark:text-indigo-300" />{' '}
              {t('admin.limitLabels.max_teachers')}
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white">
              {getLimitValue(plan, 'max_teachers')}
            </span>
          </div>
        </div>

        <div className="h-px bg-gray-50 dark:bg-gray-700/50 w-full" />

        <ul className="space-y-2.5">
          <li
            className={`flex items-center gap-3 text-xs font-bold transition-colors ${hasFeature(plan, 'multi_branch') ? 'text-gray-700 dark:text-gray-300' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hasFeature(plan, 'multi_branch') ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}
            >
              <Check size={12} strokeWidth={4} />
            </div>
            {t('admin.featureLabels.multi_branch')}
          </li>
          <li
            className={`flex items-center gap-3 text-xs font-bold transition-colors ${hasFeature(plan, 'advanced_reports') ? 'text-gray-700 dark:text-gray-300' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hasFeature(plan, 'advanced_reports') ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}
            >
              <Check size={12} strokeWidth={4} />
            </div>
            {t('admin.featureLabels.advanced_reports')}
          </li>
          <li
            className={`flex items-center gap-3 text-xs font-bold transition-colors ${hasFeature(plan, 'api_access') ? 'text-gray-700 dark:text-gray-300' : 'text-slate-500 dark:text-slate-400'}`}
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
          className="min-h-11 w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
          className="min-h-11 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t('subscription.downgrade')}
        </button>
      ) : (
        <button
          onClick={() => onUpgrade(plan.id, plan.name)}
          className="min-h-11 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t('subscription.upgrade')}
        </button>
      )}
    </div>
  );
};

export default PlanCard;

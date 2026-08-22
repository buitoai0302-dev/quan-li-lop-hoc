import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

import { useQuery } from '@tanstack/react-query';
import { getPlans } from '@/features/subscription/api/subscription.api';
import type { Plan, PlanFeature } from '@/types';

const Pricing: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const [billingCycle, setBillingCycle] = React.useState<'MONTHLY' | 'YEARLY'>('YEARLY');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: getPlans,
  });

  const getFeatureList = (plan: Plan) => {
    if (!Array.isArray(plan.features)) return [];

    // Customize feature display based on plan logic, or just show the boolean values
    // Here we map keys to translations (you might need more translations, but let's do basic)
    return (plan.features as PlanFeature[]).map((f) => ({
      name: t(`admin.featureLabels.${f.feature_key}`, f.feature_key),
      included: f.is_enabled,
    }));
  };

  const getPlanDescription = (planCode: string) => {
    switch (planCode) {
      case 'FREE':
        return t('subscription.freeDesc', 'Perfect for small tutors and independent teachers.');
      case 'PRO':
        return t('subscription.proDesc', 'Ideal for growing educational centers.');
      case 'BUSINESS':
        return t('subscription.businessDesc', 'Advanced tools for multi-branch centers.');
      case 'ENTERPRISE':
        return t('subscription.enterpriseDesc', 'For large organizations with complex needs.');
      default:
        return '';
    }
  };

  return (
    <section id="pricing" className="py-24 bg-white dark:bg-slate-900 relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-4">
            {t('landing.pricingLabel', 'Pricing Plans')}
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            {t('landing.pricingHeading', 'Simple, transparent pricing')}
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {t(
              'landing.pricingSubheading',
              'Choose the perfect plan for your center. No hidden fees.'
            )}
          </p>
        </div>

        {/* Toggle Billing Cycle */}
        <div className="flex justify-center mb-12">
          <div className="relative flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-gray-200/50 dark:border-gray-700/50 w-[340px] sm:w-[400px]">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-full shadow-md transition-all duration-300 ease-out ${billingCycle === 'YEARLY' ? 'left-1/2 ml-[2px]' : 'left-1'}`}
            />
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`relative z-10 flex-1 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-colors flex items-center justify-center ${
                billingCycle === 'MONTHLY'
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('common.monthlyBilling', 'Hàng tháng')}
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`relative z-10 flex-1 py-1 rounded-full text-sm font-bold transition-colors flex flex-col items-center justify-center gap-0.5 ${
                billingCycle === 'YEARLY'
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="leading-none mt-0.5">{t('common.yearlyBilling', 'Hàng năm')}</span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest leading-none transition-colors ${
                  billingCycle === 'YEARLY'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}
              >
                {t('common.saveAmount', 'Tiết kiệm 15%')}
              </span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => {
              const isYearly = billingCycle === 'YEARLY';
              const monthlyPrice = isVi ? Number(plan.price_vnd) || 0 : Number(plan.price_usd) || 0;
              const yearlyPrice = isVi
                ? Number(plan.yearly_price_vnd) || 0
                : Number(plan.yearly_price_usd) || 0;
              const displayPrice = isYearly ? yearlyPrice : monthlyPrice;

              const isPro = plan.code === 'PRO';
              const isFree = plan.code === 'FREE';

              let discountPercentage = 0;
              if (isYearly && monthlyPrice > 0 && yearlyPrice > 0) {
                const totalMonthlyCost = monthlyPrice * 12;
                if (totalMonthlyCost > yearlyPrice) {
                  discountPercentage = Math.round(
                    ((totalMonthlyCost - yearlyPrice) / totalMonthlyCost) * 100
                  );
                }
              }

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 sm:p-8 border ${
                    isPro
                      ? 'border-primary shadow-2xl shadow-primary/10 bg-white dark:bg-slate-800 scale-100 lg:scale-105 z-10'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:shadow-xl hover:-translate-y-1'
                  } transition-all duration-300 flex flex-col group`}
                >
                  {isPro && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center">
                      <span className="bg-primary text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-6 border-b border-gray-100 dark:border-gray-700/50 pb-6">
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {plan.name}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm h-12 leading-relaxed">
                      {getPlanDescription(plan.code)}
                    </p>
                    <div className="mt-4">
                      {isFree ? (
                        <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                          {t('subscription.free')}
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1 flex-wrap sm:flex-nowrap">
                            <span className="text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight shrink-0">
                              {isVi
                                ? new Intl.NumberFormat('vi-VN').format(displayPrice)
                                : displayPrice}
                            </span>
                            <span className="text-slate-500 font-medium whitespace-nowrap">
                              {isVi ? 'đ' : '$'} / {isYearly ? t('common.year') : t('common.month')}
                            </span>
                          </div>

                          {isYearly && discountPercentage > 0 && (
                            <div className="text-xs font-bold text-emerald-500 mt-1">
                              {t('subscription.saveDiscount', {
                                percent: discountPercentage,
                                amount: new Intl.NumberFormat(isVi ? 'vi-VN' : 'en-US').format(
                                  monthlyPrice * 12 - yearlyPrice
                                ),
                                currency: isVi ? 'đ' : '$',
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {getFeatureList(plan).map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        {feature.included ? (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <X size={12} className="text-slate-400" />
                          </div>
                        )}
                        <span
                          className={`text-sm ${
                            feature.included
                              ? 'text-slate-700 dark:text-slate-300 font-medium'
                              : 'text-slate-500 dark:text-slate-500'
                          }`}
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={ROUTES.REGISTER}
                    className={`w-full py-3.5 rounded-xl text-center font-bold transition-all ${
                      isPro
                        ? 'bg-primary text-white hover:bg-primary-600 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {t('landing.getStarted', 'Đăng ký ngay')}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Pricing;

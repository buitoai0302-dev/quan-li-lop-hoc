import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { getPlans } from '@/features/subscription/api/subscription.api';
import { ROUTES } from '@/utils/constants';
import type { PlanFeature } from '@/types';

const Pricing: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const vi = i18n.language.startsWith('vi');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['public-plans'],
    queryFn: getPlans,
  });
  const plans = data?.filter((plan) => plan.is_active) || [];
  return (
    <section id="pricing" className="scroll-mt-20 bg-white py-20 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center text-sm font-black uppercase tracking-widest text-indigo-600">
          {t('landing.pricingLabel')}
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
          {t('landing.pricingHeading')}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600 dark:text-slate-300">
          {t('landing.pricingSubheading')}
        </p>
        <div
          className="mx-auto mt-8 flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
          role="group"
          aria-label={t('landing.billingPeriod', 'Kỳ thanh toán')}
        >
          {(['MONTHLY', 'YEARLY'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={cycle === value}
              onClick={() => setCycle(value)}
              className={`min-h-11 rounded-lg px-5 text-sm font-bold ${cycle === value ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}
            >
              {value === 'YEARLY'
                ? t('subscription.yearlyBilling')
                : t('subscription.monthlyBilling')}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="py-16 text-center text-slate-600" role="status">
            {t('landing.loadingPlans', 'Đang tải bảng giá...')}
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-slate-700 dark:text-slate-200" role="alert">
            {t('landing.pricingError', 'Không tải được bảng giá.')}{' '}
            <button
              type="button"
              className="font-bold text-indigo-600 underline"
              onClick={() => refetch()}
            >
              {t('landing.retry', 'Thử lại')}
            </button>
          </div>
        ) : !plans.length ? (
          <p className="py-16 text-center text-slate-600" role="status">
            {t('landing.noPlans', 'Hiện chưa có gói khả dụng.')}
          </p>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const free = plan.code === 'FREE';
              const rawAmount =
                cycle === 'YEARLY'
                  ? vi
                    ? plan.yearly_price_vnd
                    : plan.yearly_price_usd
                  : vi
                    ? plan.price_vnd
                    : plan.price_usd;
              const amount = Number(rawAmount);
              const validPrice =
                free ||
                (rawAmount !== null &&
                  rawAmount !== undefined &&
                  Number.isFinite(amount) &&
                  amount >= 0);
              return (
                <article
                  key={plan.id}
                  className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50 p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="mt-2 min-h-12 text-sm text-slate-600 dark:text-slate-300">
                    {t(`subscription.${plan.code.toLowerCase()}Desc`, '')}
                  </p>
                  <p className="mt-4 text-3xl font-black text-slate-950 dark:text-white">
                    {free
                      ? t('subscription.free')
                      : validPrice
                        ? new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US', {
                            style: 'currency',
                            currency: vi ? 'VND' : 'USD',
                            maximumFractionDigits: 0,
                          }).format(amount)
                        : t('landing.priceUnavailable', 'Liên hệ để biết giá')}
                  </p>
                  {!free && validPrice && (
                    <p className="mt-1 text-sm text-slate-500">
                      / {cycle === 'YEARLY' ? t('common.year') : t('common.month')}
                    </p>
                  )}
                  <ul className="my-8 flex-1 space-y-3">
                    {(Array.isArray(plan.features) ? (plan.features as PlanFeature[]) : [])
                      .filter((f) => f.is_enabled)
                      .slice(0, 6)
                      .map((f) => (
                        <li
                          key={f.feature_key}
                          className="flex gap-2 text-sm text-slate-700 dark:text-slate-200"
                        >
                          <Check size={17} className="shrink-0 text-emerald-600" />
                          {t(`admin.featureLabels.${f.feature_key}`, f.feature_key)}
                        </li>
                      ))}
                  </ul>
                  {validPrice ? (
                    <Link
                      to={
                        free
                          ? ROUTES.REGISTER
                          : `${ROUTES.REGISTER}?plan=${encodeURIComponent(plan.code)}&cycle=${cycle}`
                      }
                      className="flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700"
                    >
                      {t('landing.getStarted')}
                    </Link>
                  ) : (
                    <span className="flex min-h-12 items-center justify-center text-sm text-slate-500">
                      {t('landing.priceUnavailable', 'Liên hệ để biết giá')}
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
export default Pricing;

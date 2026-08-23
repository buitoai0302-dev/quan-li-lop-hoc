import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, ArrowRight, Info, CreditCard } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { PLAN_REQUEST_STATUS, PLAN_BILLING_CYCLE } from '@/utils/constants';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';

import PlanCard from './PlanCard';

import { useSubscriptionData } from '../hooks/useSubscription';
import { usePublicSettings } from '@/features/admin/hooks/useSystemSettings';
import { useNavigate } from 'react-router-dom';

const Subscription: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const { data, isLoading: loading } = useSubscriptionData();
  const { data: settings } = usePublicSettings();
  const navigate = useNavigate();

  const isSubmitting = false; // No longer submitting directly here

  const plans = data?.plans || [];
  const currentTenantPlanId = data?.tenant?.plan_id || null;
  const initialPendingId =
    data?.requestStatus?.status === PLAN_REQUEST_STATUS.PENDING
      ? data?.requestStatus?.requested_plan_id
      : null;

  const isVi = i18n.language === 'vi';

  const pendingPlanId = initialPendingId || null;
  const [billingCycle, setBillingCycle] = useState<
    typeof PLAN_BILLING_CYCLE.MONTHLY | typeof PLAN_BILLING_CYCLE.YEARLY
  >(PLAN_BILLING_CYCLE.YEARLY);

  const maxSavingsPercent = useMemo(() => {
    if (!plans || plans.length === 0) return 0;
    return plans.reduce((max, p) => {
      const priceMonth = isVi ? Number(p.price_vnd) : Number(p.price_usd);
      const priceYear = isVi ? Number(p.yearly_price_vnd) : Number(p.yearly_price_usd);
      if (priceMonth > 0 && priceYear > 0) {
        const costIfMonthly = priceMonth * 12;
        const savings = costIfMonthly - priceYear;
        const percent = Math.round((savings / costIfMonthly) * 100);
        return percent > max ? percent : max;
      }
      return max;
    }, 0);
  }, [plans, isVi]);

  const handleUpgradeClick = (planId: string, planName: string) => {
    navigate('/checkout', { state: { planId, planName, billingCycle } });
  };

  const handleContactSales = () => {
    const zaloLink = settings?.CONTACT_ZALO;
    if (zaloLink) {
      window.open(zaloLink, '_blank');
    } else {
      const supportEmail = settings?.CONTACT_EMAIL || 'support@eduschedule.com';
      const subject = encodeURIComponent(t('subscription.consultSubject'));
      const body = encodeURIComponent(t('subscription.consultBody', { email: user?.email }));
      window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader icon={CreditCard}>
        <div className="flex justify-center w-full lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-auto">
          <div className="relative flex bg-gray-100 dark:bg-gray-800/80 rounded-full p-1 border border-gray-200/50 dark:border-gray-700/50 w-[310px] sm:w-[350px]">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-full shadow-md transition-all duration-300 ease-out ${billingCycle === PLAN_BILLING_CYCLE.YEARLY ? 'left-1/2 ml-[2px]' : 'left-1'}`}
            />
            <button
              onClick={() => setBillingCycle(PLAN_BILLING_CYCLE.MONTHLY)}
              className={`relative z-10 flex-1 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black transition-colors uppercase tracking-wider flex items-center justify-center ${
                billingCycle === PLAN_BILLING_CYCLE.MONTHLY
                  ? 'text-white drop-shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {t('subscription.monthlyBilling')}
            </button>

            <button
              onClick={() => setBillingCycle(PLAN_BILLING_CYCLE.YEARLY)}
              className={`relative z-10 flex-1 py-1 rounded-full text-[10px] sm:text-xs font-black transition-colors uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 ${
                billingCycle === PLAN_BILLING_CYCLE.YEARLY
                  ? 'text-white drop-shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <span className="leading-none mt-0.5">{t('subscription.yearlyBilling')}</span>
              {maxSavingsPercent > 0 && (
                <span
                  className={`text-[8px] px-1.5 py-[2px] rounded-full font-bold whitespace-nowrap transition-colors leading-none ${
                    billingCycle === PLAN_BILLING_CYCLE.YEARLY
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                  }`}
                >
                  {t('subscription.saveUpTo', { percent: maxSavingsPercent })}
                </span>
              )}
            </button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto custom-scrollbar px-1 pt-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 px-2">
            {plans
              .filter((p) => p.is_active || p.id === currentTenantPlanId)
              .map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={plan.id === currentTenantPlanId}
                  isVi={isVi}
                  isSubmitting={isSubmitting}
                  pendingPlanId={pendingPlanId}
                  billingCycle={billingCycle}
                  onUpgrade={handleUpgradeClick}
                  t={t}
                />
              ))}
          </div>

          {/* Support CTA */}
          <div className="bg-gradient-to-br from-indigo-950 via-blue-900 to-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20 mx-2">
            <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12">
              <div className="space-y-4 text-center xl:text-left max-w-2xl">
                <h2 className="text-2xl md:text-4xl font-black leading-tight tracking-tight uppercase italic">
                  {t('subscription.customTitle')}
                  <br />
                  <span className="text-primary">{t('subscription.customSubtitle')}</span>
                </h2>
                <p className="text-indigo-100/80 text-base md:text-lg font-medium leading-relaxed">
                  {t('subscription.customDesc')}
                </p>
              </div>
              <button
                onClick={handleContactSales}
                className="flex items-center gap-3 px-8 py-4 bg-white text-indigo-950 rounded-xl font-bold text-base md:text-lg hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95 uppercase tracking-wide shrink-0"
              >
                <MessageSquare size={20} /> {t('subscription.contactSales')}{' '}
                <ArrowRight size={20} />
              </button>
            </div>

            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
          </div>

          {/* FAQ Link */}
          <div className="flex flex-col items-center gap-4 text-center pb-8">
            <div className="flex items-center gap-3 px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <Info className="text-primary" size={24} />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
                {t('subscription.policy')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, ArrowRight, Info, CreditCard } from 'lucide-react';
import { getPlans, getTenant, getPlanRequestStatus, requestPlanUpgrade } from '../api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { handleApiError } from '@/utils/errorHelper';
import { PLAN_REQUEST_STATUS } from '@/utils/constants';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import type { Plan } from '@/types';

import PlanCard from './PlanCard';

const Subscription: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTenantPlanId, setCurrentTenantPlanId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVi = i18n.language === 'vi';

  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansData, tenantData, requestsData] = await Promise.all([
          getPlans(),
          getTenant(),
          getPlanRequestStatus().catch(() => null),
        ]);
        setPlans(plansData);
        setCurrentTenantPlanId(tenantData.plan_id);
        if (requestsData?.status === PLAN_REQUEST_STATUS.PENDING) {
          setPendingPlanId(requestsData.requested_plan_id);
        }
      } catch (err: any) {
        handleApiError(err, t);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [t]);

  const handleRequestUpgrade = async (planId: string, planName: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await requestPlanUpgrade(planId);
      toast.success(t('subscription.requestSent', { planName }));
      setPendingPlanId(planId);
    } catch (err: any) {
      handleApiError(err, t);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSales = () => {
    const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@eduschedule.com';
    const subject = encodeURIComponent(t('subscription.consultSubject'));
    const body = encodeURIComponent(t('subscription.consultBody', { email: user?.email }));
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

  if (loading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader icon={CreditCard} />

      <div className="flex-1 overflow-auto custom-scrollbar px-1 pt-4">
        <div className="max-w-7xl mx-auto space-y-12">
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
                  onUpgrade={handleRequestUpgrade}
                  t={t}
                />
              ))}
          </div>

          {/* Support CTA */}
          <div className="bg-gradient-to-br from-indigo-950 via-blue-900 to-indigo-900 rounded-[3rem] p-10 md:p-20 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20 mx-2">
            <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12">
              <div className="space-y-6 text-center xl:text-left max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter uppercase italic">
                  {t('subscription.customTitle')}
                  <br />
                  <span className="text-primary">{t('subscription.customSubtitle')}</span>
                </h2>
                <p className="text-indigo-100/80 text-lg font-medium leading-relaxed">
                  {t('subscription.customDesc')}
                </p>
              </div>
              <button
                onClick={handleContactSales}
                className="flex items-center gap-4 px-12 py-6 bg-white text-indigo-950 rounded-2xl font-black text-xl hover:bg-primary hover:text-white transition-all shadow-2xl active:scale-95 uppercase tracking-widest shrink-0"
              >
                <MessageSquare /> {t('subscription.contactSales')} <ArrowRight />
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

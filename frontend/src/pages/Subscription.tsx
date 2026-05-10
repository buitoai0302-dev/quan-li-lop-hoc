import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Zap,
  Shield,
  Crown,
  Building,
  Users,
  Layout,
  MessageSquare,
  ArrowRight,
  Info,
  CreditCard
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHelper';
import { PLAN_CODES, PLAN_REQUEST_STATUS } from '../utils/constants';
import PageHeader from '../components/common/PageHeader';
import PageLoading from '../components/common/PageLoading';

interface PlanLimit {
  limit_key: string;
  limit_value: number;
}

interface PlanFeature {
  feature_key: string;
  is_enabled: boolean;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  price_vnd: number;
  price_usd: number;
  is_active: boolean;
  limits: PlanLimit[];
  features: PlanFeature[];
}

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
        const [plansRes, tenantRes, requestsRes] = await Promise.all([
          api.get('/plans'),
          api.get('/tenant'),
          api.get('/plans/request/status').catch(() => ({ data: null }))
        ]);
        setPlans(plansRes.data);
        setCurrentTenantPlanId(tenantRes.data.plan_id);
        if (requestsRes.data?.status === PLAN_REQUEST_STATUS.PENDING) {
          setPendingPlanId(requestsRes.data.requested_plan_id);
        }
      } catch (err) {
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
      await api.post('/plans/request', { planId });
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

  const getLimitValue = (plan: Plan, key: string) => {
    const limit = plan.limits.find(l => l.limit_key === key);
    if (!limit) return 0;
    return limit.limit_value === -1 ? '∞' : limit.limit_value;
  };

  const hasFeature = (plan: Plan, key: string) => {
    return plan.features.find(f => f.feature_key === key)?.is_enabled || false;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={CreditCard}
      />

      <div className="flex-1 overflow-auto custom-scrollbar px-1 pt-4">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 px-2">
            {plans
              .filter(p => p.is_active || p.id === currentTenantPlanId)
              .map((plan) => {
                const isCurrent = plan.id === currentTenantPlanId;
                const isFree = plan.code === PLAN_CODES.FREE;
                const isPro = plan.code === PLAN_CODES.PRO;
                const isBusiness = plan.code === PLAN_CODES.BUSINESS;
                const isEnterprise = plan.code === PLAN_CODES.ENTERPRISE;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-3xl border transition-all duration-500 group ${isCurrent
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
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${isFree ? 'bg-gray-100 text-gray-400' :
                        isPro ? 'bg-blue-500 text-white shadow-blue-500/20' :
                          isBusiness ? 'bg-purple-600 text-white shadow-purple-600/20' :
                            'bg-amber-500 text-white shadow-amber-500/20'
                        }`}>
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
                      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight uppercase">{plan.name}</h3>
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1 whitespace-nowrap flex-nowrap">
                          <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter shrink-0">
                            {isVi ? new Intl.NumberFormat('vi-VN').format(plan.price_vnd) : plan.price_usd}
                          </span>
                          <span className="text-lg font-black text-gray-900 dark:text-white shrink-0">{isVi ? 'đ' : '$'}</span>
                          <span className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1 shrink-0">/{t('common.month')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-8 mb-10">
                      {/* Limits */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2 uppercase tracking-tight"><Building size={16} className="text-primary opacity-60" /> {t('admin.limitLabels.max_branches')}</span>
                          <span className="text-sm font-black text-gray-900 dark:text-white">{getLimitValue(plan, 'max_branches')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2 uppercase tracking-tight"><Layout size={16} className="text-primary opacity-60" /> {t('admin.limitLabels.max_classes')}</span>
                          <span className="text-sm font-black text-gray-900 dark:text-white">{getLimitValue(plan, 'max_classes')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2 uppercase tracking-tight"><Users size={16} className="text-primary opacity-60" /> {t('admin.limitLabels.max_teachers')}</span>
                          <span className="text-sm font-black text-gray-900 dark:text-white">{getLimitValue(plan, 'max_teachers')}</span>
                        </div>
                      </div>

                      <div className="h-px bg-gray-50 dark:bg-gray-700/50 w-full" />

                      {/* Features */}
                      <ul className="space-y-4">
                        <li className={`flex items-center gap-3 text-xs font-bold transition-colors ${hasFeature(plan, 'multi_branch') ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hasFeature(plan, 'multi_branch') ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}>
                            <Check size={12} strokeWidth={4} />
                          </div>
                          {t('admin.featureLabels.multi_branch')}
                        </li>
                        <li className={`flex items-center gap-3 text-xs font-bold transition-colors ${hasFeature(plan, 'advanced_reports') ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hasFeature(plan, 'advanced_reports') ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}>
                            <Check size={12} strokeWidth={4} />
                          </div>
                          {t('admin.featureLabels.advanced_reports')}
                        </li>
                        <li className={`flex items-center gap-3 text-xs font-bold transition-colors ${hasFeature(plan, 'api_access') ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hasFeature(plan, 'api_access') ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}>
                            <Check size={12} strokeWidth={4} />
                          </div>
                          {t('admin.featureLabels.api_access')}
                        </li>
                      </ul>
                    </div>

                    <button
                      disabled={isCurrent || isSubmitting || plan.id === pendingPlanId}
                      onClick={() => handleRequestUpgrade(plan.id, plan.name)}
                      className={`w-full py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${isCurrent || isSubmitting || plan.id === pendingPlanId
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default shadow-none'
                        : 'bg-primary text-white hover:bg-primary-dark hover:scale-[1.02] active:scale-95 shadow-primary/20'
                        }`}
                    >
                      {isSubmitting
                        ? t('common.sending')
                        : plan.id === pendingPlanId
                          ? t('subscription.pending')
                          : (isCurrent ? t('subscription.current') : (isFree ? t('subscription.downgrade') : t('subscription.upgrade')))}
                    </button>
                  </div>
                );
              })}
          </div>

          {/* Support CTA */}
          <div className="bg-gradient-to-br from-indigo-950 via-blue-900 to-indigo-900 rounded-[3rem] p-10 md:p-20 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20 mx-2">
            <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12">
              <div className="space-y-6 text-center xl:text-left max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter uppercase italic">
                  {t('subscription.customTitle')}<br />
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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Check, 
  Zap, 
  Shield, 
  Crown, 
  Building, 
  Users, 
  Calendar, 
  Layout, 
  MessageSquare,
  ArrowRight,
  Info
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

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

  const isVi = i18n.language === 'vi';

  const formatPrice = (plan: Plan) => {
    if (isVi) {
      return new Intl.NumberFormat('vi-VN').format(plan.price_vnd) + ' đ';
    }
    return '$' + plan.price_usd;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, tenantRes] = await Promise.all([
          api.get('/plans'),
          api.get('/tenant')
        ]);
        setPlans(plansRes.data);
        setCurrentTenantPlanId(tenantRes.data.plan_id);
      } catch (err) {
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [t]);

  const handleRequestUpgrade = async (planId: string, planName: string) => {
    try {
      await api.post('/plans/request', { planId });
      toast.success(t('subscription.requestSent', { planName }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'));
    }
  };

  const handleContactSales = () => {
    const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@eduschedule.com';
    const subject = encodeURIComponent(`Yêu cầu tư vấn EduSchedule - ${user?.email}`);
    const body = encodeURIComponent(`Chào đội ngũ EduSchedule,\n\nTôi đang quan tâm đến các giải pháp đặc thù cho trung tâm của mình. Rất mong nhận được sự tư vấn từ quý vị.\n\nThông tin liên hệ:\nEmail: ${user?.email}`);
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getLimitValue = (plan: Plan, key: string) => {
    const limit = plan.limits.find(l => l.limit_key === key);
    if (!limit) return 0;
    return limit.limit_value === -1 ? '∞' : limit.limit_value;
  };

  const hasFeature = (plan: Plan, key: string) => {
    return plan.features.find(f => f.feature_key === key)?.is_enabled || false;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {t('subscription.title', 'Nâng tầm Trung tâm của bạn')}
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          {t('subscription.subtitle', 'Chọn gói dịch vụ phù hợp với quy mô và nhu cầu phát triển của bạn.')}
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
        {plans
          .filter(p => p.is_active || p.id === currentTenantPlanId)
          .map((plan) => {
          const isCurrent = plan.id === currentTenantPlanId;
          const isFree = plan.code === 'FREE';
          const isPro = plan.code === 'PRO';
          const isBusiness = plan.code === 'BUSINESS';
          const isEnterprise = plan.code === 'ENTERPRISE';

          return (
            <div 
              key={plan.id}
              className={`relative flex flex-col p-8 bg-white dark:bg-gray-800 rounded-3xl border transition-all duration-300 ${
                isCurrent 
                  ? 'border-primary ring-2 ring-primary/20 shadow-xl scale-105 z-10' 
                  : 'border-gray-100 dark:border-gray-700 hover:shadow-lg'
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  {t('subscription.currentPlan', 'Gói hiện tại')}
                </div>
              )}

              {isPro && (
                <div className="absolute top-4 right-4 text-amber-500">
                  <Zap size={24} fill="currentColor" />
                </div>
              )}
              {isBusiness && (
                <div className="absolute top-4 right-4 text-blue-500">
                  <Shield size={24} fill="currentColor" />
                </div>
              )}
              {isEnterprise && (
                <div className="absolute top-4 right-4 text-purple-500">
                  <Crown size={24} fill="currentColor" />
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900 dark:text-white">{formatPrice(plan)}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">/{t('common.month')}</span>
                </div>
              </div>

              <div className="flex-1 space-y-6 mb-8">
                {/* Limits */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Building size={16}/> {t('admin.limitLabels.max_branches')}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{getLimitValue(plan, 'max_branches')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Layout size={16}/> {t('admin.limitLabels.max_classes')}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{getLimitValue(plan, 'max_classes')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Users size={16}/> {t('admin.limitLabels.max_teachers')}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{getLimitValue(plan, 'max_teachers')}</span>
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-700 w-full" />

                {/* Features */}
                <ul className="space-y-3">
                  <li className={`flex items-center gap-3 text-sm ${hasFeature(plan, 'multi_branch') ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 line-through'}`}>
                    <Check size={16} className={hasFeature(plan, 'multi_branch') ? 'text-green-500' : 'text-gray-300'} />
                    {t('admin.featureLabels.multi_branch')}
                  </li>
                  <li className={`flex items-center gap-3 text-sm ${hasFeature(plan, 'advanced_reports') ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 line-through'}`}>
                    <Check size={16} className={hasFeature(plan, 'advanced_reports') ? 'text-green-500' : 'text-gray-300'} />
                    {t('admin.featureLabels.advanced_reports')}
                  </li>
                  <li className={`flex items-center gap-3 text-sm ${hasFeature(plan, 'api_access') ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 line-through'}`}>
                    <Check size={16} className={hasFeature(plan, 'api_access') ? 'text-green-500' : 'text-gray-300'} />
                    {t('admin.featureLabels.api_access')}
                  </li>
                </ul>
              </div>

              <button
                disabled={isCurrent}
                onClick={() => handleRequestUpgrade(plan.id, plan.name)}
                className={`w-full py-3 px-6 rounded-2xl font-bold transition-all ${
                  isCurrent
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02] active:scale-95 shadow-lg'
                }`}
              >
                {isCurrent ? t('subscription.current', 'Đang sử dụng') : (isFree ? t('subscription.downgrade', 'Về gói Free') : t('subscription.upgrade', 'Nâng cấp ngay'))}
              </button>
            </div>
          );
        })}
      </div>

      {/* Support CTA */}
      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-black leading-tight">
              {t('subscription.customTitle', 'Bạn cần giải pháp đặc thù?')}<br/>
              <span className="text-blue-400">{t('subscription.customSubtitle', 'Hãy liên hệ với đội ngũ chuyên gia.')}</span>
            </h2>
            <p className="text-indigo-100/80 max-w-lg">
              {t('subscription.customDesc', 'Chúng tôi sẵn sàng tư vấn và xây dựng các tính năng riêng biệt phù hợp với quy trình vận hành của trung tâm bạn.')}
            </p>
          </div>
          <button 
            onClick={handleContactSales}
            className="flex items-center gap-3 px-10 py-5 bg-white text-indigo-900 rounded-full font-black text-lg hover:bg-blue-50 transition-colors shadow-xl"
          >
            <MessageSquare /> {t('subscription.contactSales', 'Liên hệ tư vấn')} <ArrowRight />
          </button>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* FAQ Link */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Info className="text-primary" size={20} />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('subscription.policy', 'Tất cả các gói đều bao gồm hỗ trợ kỹ thuật 24/7 và sao lưu dữ liệu tự động.')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Subscription;

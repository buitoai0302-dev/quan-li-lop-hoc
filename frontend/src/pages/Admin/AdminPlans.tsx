import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import toast from 'react-hot-toast';
import { handleApiError } from '../../utils/errorHelper';
import { Save, Info, Building, Zap, Shield, Crown, Settings } from 'lucide-react';
import { PLAN_CODES } from '../../utils/constants';
import PageHeader from '../../components/common/PageHeader';
import PageLoading from '../../components/common/PageLoading';
import Card from '../../components/common/Card';
import type { Plan } from '../../types';



const AdminPlans: React.FC = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/admin/plans');
      setPlans(res.data);
    } catch (error) {
      handleApiError(error, t);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleUpdateField = (planId: string, category: 'limits' | 'features', key: string, value: any) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return {
        ...p,
        [category]: { ...p[category], [key]: value }
      };
    }));
  };

  const handleSavePlan = async (plan: Plan) => {
    setSavingId(plan.id);
    try {
      await api.put(`/admin/plans/${plan.id}`, {
        name: plan.name,
        priceVnd: plan.price_vnd,
        priceUsd: plan.price_usd,
        isActive: plan.is_active,
        limits: plan.limits,
        features: plan.features
      });
      toast.success(t('common.success'));
      fetchPlans();
    } catch (error) {
      handleApiError(error, t);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader 
        icon={Settings}
      />

      <div className="flex-1 overflow-auto custom-scrollbar px-1">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className="h-full flex flex-col group transition-all hover:shadow-2xl hover:border-primary/20"
                header={
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${plan.code === PLAN_CODES.FREE ? 'bg-gray-100 text-gray-400' :
                        plan.code === PLAN_CODES.PRO ? 'bg-blue-500 text-white shadow-blue-500/20' :
                          plan.code === PLAN_CODES.BUSINESS ? 'bg-purple-600 text-white shadow-purple-600/20' :
                            'bg-amber-500 text-white shadow-amber-500/20'
                        }`}>
                        {plan.code === PLAN_CODES.FREE && <Building size={20} />}
                        {plan.code === PLAN_CODES.PRO && <Zap size={20} fill="currentColor" />}
                        {plan.code === PLAN_CODES.BUSINESS && <Shield size={20} fill="currentColor" />}
                        {plan.code === PLAN_CODES.ENTERPRISE && <Crown size={20} fill="currentColor" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">{plan.name}</h3>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 tracking-widest">{plan.code}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm shrink-0">
                      <span className={`text-[8px] font-black uppercase ${plan.is_active ? 'text-emerald-500' : 'text-gray-400'}`}>{plan.is_active ? t('common.active') : t('common.inactive')}</span>
                      <button
                        onClick={() => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p))}
                        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${plan.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ease-in-out ${plan.is_active ? 'left-4.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                }
                footer={
                  <button
                    onClick={() => handleSavePlan(plan)}
                    disabled={savingId === plan.id}
                    className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {savingId === plan.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={16} strokeWidth={3} /> {t('admin.savePlan')}
                      </>
                    )}
                  </button>
                }
              >
                <div className="flex flex-col h-full">
                  {/* Pricing Section */}
                  <div className="p-5 bg-white dark:bg-gray-800 grid grid-cols-2 gap-4 border-b border-gray-50 dark:border-gray-700/50">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block truncate">VND / {t('common.month')}</span>
                      <input
                        type="number"
                        value={plan.price_vnd}
                        onChange={(e) => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price_vnd: e.target.value } : p))}
                        className="w-full bg-gray-50 dark:bg-gray-900/40 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 border-l border-gray-50 dark:border-gray-700/50 pl-4">
                      <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block truncate">USD / {t('common.month')}</span>
                      <input
                        type="number"
                        value={plan.price_usd}
                        onChange={(e) => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price_usd: e.target.value } : p))}
                        className="w-full bg-gray-50 dark:bg-gray-900/40 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-6 space-y-8 flex-1">
                    {/* Limits */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <Info size={14} className="text-primary" /> {t('admin.limits')}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {!Array.isArray(plan.limits) && Object.entries(plan.limits).map(([key, value]) => (
                          <div key={key} className="space-y-1.5">
                            <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight block truncate ml-1">
                              {t(`admin.limitLabels.${key}`, key)}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={value}
                                onChange={(e) => handleUpdateField(plan.id, 'limits', key, parseInt(e.target.value, 10))}
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-xl px-4 py-2.5 text-xs font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary transition-all outline-none"
                              />
                              {value === -1 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary font-black">∞</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-4 pt-6 border-t border-gray-50 dark:border-gray-700/50">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" /> {t('admin.features')}
                      </h4>
                      <div className="space-y-2">
                        {!Array.isArray(plan.features) && Object.entries(plan.features).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all">
                            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                              {t(`admin.featureLabels.${key}`, key)}
                            </span>
                            <button
                              onClick={() => handleUpdateField(plan.id, 'features', key, !value)}
                              className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-all duration-300 focus:outline-none ${value ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${value ? 'left-4.5' : 'left-0.5'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPlans;

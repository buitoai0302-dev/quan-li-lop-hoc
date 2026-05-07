import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHelper';
import { List, Save, Info } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  code: string;
  price_vnd: string;
  price_usd: string;
  is_active: boolean;
  limits: Record<string, number>;
  features: Record<string, boolean>;
}

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

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
          <List size={28} className="text-primary" /> {t('admin.plansTitle')}
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <code className="text-xs font-mono text-gray-500">{plan.code}</code>
                </div>
                <div className="flex flex-col items-center gap-1 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <span className="text-[9px] font-black uppercase text-gray-400">{plan.is_active ? t('common.active') : t('common.inactive')}</span>
                  <button 
                    onClick={() => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p))}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${plan.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${plan.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              <div className="text-right space-y-3">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">VND / {t('common.month')}</span>
                  <input 
                    type="number"
                    value={plan.price_vnd}
                    onChange={(e) => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price_vnd: e.target.value } : p))}
                    className="w-32 text-right font-black text-gray-900 dark:text-white bg-transparent border-b border-gray-300 focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">USD / {t('common.month')}</span>
                  <input 
                    type="number"
                    value={plan.price_usd}
                    onChange={(e) => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price_usd: e.target.value } : p))}
                    className="w-32 text-right font-black text-gray-900 dark:text-white bg-transparent border-b border-gray-300 focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Limits Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  {t('admin.limits')} <Info size={14} />
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(plan.limits).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t(`admin.limitLabels.${key}`, key)}
                      </label>
                      <input 
                        type="number"
                        value={value}
                        onChange={(e) => handleUpdateField(plan.id, 'limits', key, parseInt(e.target.value, 10))}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:text-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">(-1 = {t('common.unlimited')})</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">{t('admin.features')}</h4>
                <div className="space-y-2">
                  {Object.entries(plan.features).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t(`admin.featureLabels.${key}`, key)}
                      </span>
                      <button 
                        onClick={() => handleUpdateField(plan.id, 'features', key, !value)}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${value ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={() => handleSavePlan(plan)}
                disabled={savingId === plan.id}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {savingId === plan.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save size={18} /> {t('admin.savePlan')}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPlans;

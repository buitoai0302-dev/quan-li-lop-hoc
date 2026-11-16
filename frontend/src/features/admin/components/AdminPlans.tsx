import PageError from '@/components/common/PageError';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { handleApiError } from '@/utils/errorHelper';
import { Save, Info, Building, Zap, Shield, Crown, Settings } from 'lucide-react';
import { PLAN_CODES } from '@/utils/constants';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import { Card, Button, Input } from '@/components/common/UI';
import type { AdminPlan } from '../api/admin.api';

import { useAdminPlans, useUpdatePlan } from '../hooks/useAdmin';

const AdminPlans: React.FC = () => {
  const { t } = useTranslation();

  const pageQuery = useAdminPlans();
  const { data: fetchedPlans, isLoading: loading } = pageQuery;
  const { mutateAsync: updatePlan } = useUpdatePlan();

  const [drafts, setDrafts] = useState<Partial<Record<string, AdminPlan>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const plans = fetchedPlans?.map((plan) => drafts[plan.id] ?? plan) ?? [];

  const updateDraft = (plan: AdminPlan, changes: Partial<AdminPlan>) => {
    setDrafts((current) => ({
      ...current,
      [plan.id]: { ...(current[plan.id] ?? plan), ...changes },
    }));
  };

  const handleSavePlan = async (plan: AdminPlan) => {
    setSavingId(plan.id);
    try {
      await updatePlan({
        id: plan.id,
        data: {
          name: plan.name,
          priceVnd: plan.price_vnd,
          priceUsd: plan.price_usd,
          yearlyPriceVnd: plan.yearly_price_vnd,
          yearlyPriceUsd: plan.yearly_price_usd,
          isActive: plan.is_active,
          limits: plan.limits,
          features: plan.features,
        },
      });
      setDrafts((current) => {
        if (current[plan.id] !== plan) return current;
        const remaining = { ...current };
        delete remaining[plan.id];
        return remaining;
      });
      toast.success(t('common.success'));
    } catch (error) {
      if (isAxiosError(error)) handleApiError(error, t);
      else toast.error(t('common.error'));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <PageLoading />;

  const failedQueries = [pageQuery].filter((query) => query.isError && query.data === undefined);
  if (failedQueries.length > 0)
    return (
      <PageError
        retrying={failedQueries.some((query) => query.isFetching)}
        onRetry={() => Promise.all(failedQueries.map((query) => query.refetch()))}
      />
    );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader icon={Settings} />

      <div className="flex-1 overflow-auto custom-scrollbar px-1">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className="h-full flex flex-col group transition-all hover:shadow-2xl hover:border-primary/20"
                header={
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                          plan.code === PLAN_CODES.FREE
                            ? 'bg-gray-100 text-gray-400'
                            : plan.code === PLAN_CODES.PRO
                              ? 'bg-blue-500 text-white shadow-blue-500/20'
                              : plan.code === PLAN_CODES.BUSINESS
                                ? 'bg-purple-600 text-white shadow-purple-600/20'
                                : 'bg-amber-500 text-white shadow-amber-500/20'
                        }`}
                      >
                        {plan.code === PLAN_CODES.FREE && <Building size={20} />}
                        {plan.code === PLAN_CODES.PRO && <Zap size={20} fill="currentColor" />}
                        {plan.code === PLAN_CODES.BUSINESS && (
                          <Shield size={20} fill="currentColor" />
                        )}
                        {plan.code === PLAN_CODES.ENTERPRISE && (
                          <Crown size={20} fill="currentColor" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">
                          {plan.name}
                        </h3>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 tracking-widest">
                          {plan.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm shrink-0">
                      <span
                        className={`text-[8px] font-black uppercase ${plan.is_active ? 'text-emerald-500' : 'text-gray-400'}`}
                      >
                        {plan.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={plan.is_active}
                        aria-label={t('admin.planStatus', { name: plan.name })}
                        onClick={() => updateDraft(plan, { is_active: !plan.is_active })}
                        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${plan.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ease-in-out ${plan.is_active ? 'left-4.5' : 'left-0.5'}`}
                        />
                      </button>
                    </div>
                  </div>
                }
                footer={
                  <Button
                    onClick={() => handleSavePlan(plan)}
                    loading={savingId === plan.id}
                    disabled={savingId !== null}
                    className="w-full uppercase tracking-[0.15em] text-[10px]"
                    icon={<Save size={16} strokeWidth={3} />}
                  >
                    {t('admin.savePlan')}
                  </Button>
                }
              >
                <div className="flex flex-col h-full">
                  {/* Pricing Section */}
                  <div className="p-5 bg-white dark:bg-gray-800 flex flex-col gap-4 border-b border-gray-50 dark:border-gray-700/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`${plan.id}-vnd-month`}
                          className="text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          VND / {t('common.month')}
                        </label>
                        <Input
                          id={`${plan.id}-vnd-month`}
                          type="number"
                          value={Number.isNaN(plan.price_vnd) ? '' : plan.price_vnd}
                          onChange={(e) => updateDraft(plan, { price_vnd: e.target.valueAsNumber })}
                          size="sm"
                        />
                      </div>
                      <div className="space-y-1.5 border-l border-gray-50 dark:border-gray-700/50 pl-4">
                        <label
                          htmlFor={`${plan.id}-usd-month`}
                          className="text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          USD / {t('common.month')}
                        </label>
                        <Input
                          id={`${plan.id}-usd-month`}
                          type="number"
                          step="0.01"
                          value={Number.isNaN(plan.price_usd) ? '' : plan.price_usd}
                          onChange={(e) => updateDraft(plan, { price_usd: e.target.valueAsNumber })}
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-50 dark:border-gray-700/50 pt-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`${plan.id}-vnd-year`}
                          className="text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          VND / {t('common.year')}
                        </label>
                        <Input
                          id={`${plan.id}-vnd-year`}
                          type="number"
                          value={
                            Number.isNaN(plan.yearly_price_vnd) ? '' : (plan.yearly_price_vnd ?? 0)
                          }
                          onChange={(e) =>
                            updateDraft(plan, { yearly_price_vnd: e.target.valueAsNumber })
                          }
                          size="sm"
                        />
                      </div>
                      <div className="space-y-1.5 border-l border-gray-50 dark:border-gray-700/50 pl-4">
                        <label
                          htmlFor={`${plan.id}-usd-year`}
                          className="text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          USD / {t('common.year')}
                        </label>
                        <Input
                          id={`${plan.id}-usd-year`}
                          type="number"
                          step="0.01"
                          value={
                            Number.isNaN(plan.yearly_price_usd) ? '' : (plan.yearly_price_usd ?? 0)
                          }
                          onChange={(e) =>
                            updateDraft(plan, { yearly_price_usd: e.target.valueAsNumber })
                          }
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-8 flex-1">
                    {/* Limits */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <Info size={14} className="text-primary" /> {t('admin.limits')}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {!Array.isArray(plan.limits) &&
                          Object.entries(plan.limits).map(([key, value]) => (
                            <div key={key} className="space-y-1.5">
                              <label
                                htmlFor={`${plan.id}-${key}`}
                                className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight block truncate ml-1"
                              >
                                {t(`admin.limitLabels.${key}`, key)}
                              </label>
                              <div className="relative">
                                <input
                                  id={`${plan.id}-${key}`}
                                  type="number"
                                  value={value}
                                  onChange={(e) =>
                                    updateDraft(plan, {
                                      limits: {
                                        ...plan.limits,
                                        [key]: parseInt(e.target.value, 10),
                                      },
                                    })
                                  }
                                  className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-xl px-4 py-2.5 text-xs font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary transition-all outline-none"
                                />
                                {value === -1 && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary font-black">
                                    ∞
                                  </span>
                                )}
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
                        {!Array.isArray(plan.features) &&
                          Object.entries(plan.features).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all"
                            >
                              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                {t(`admin.featureLabels.${key}`, key)}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={Boolean(value)}
                                aria-label={t('admin.planFeature', {
                                  name: plan.name,
                                  feature: t(`admin.featureLabels.${key}`, key),
                                })}
                                onClick={() =>
                                  updateDraft(plan, {
                                    features: { ...plan.features, [key]: !value },
                                  })
                                }
                                className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${value ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                <span
                                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${value ? 'left-4.5' : 'left-0.5'}`}
                                />
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

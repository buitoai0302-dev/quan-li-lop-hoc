import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHelper';
import { Shield, Building, Users, Calendar, CheckCircle, XCircle, Zap, Clock, Crown } from 'lucide-react';
import Modal from '../components/Modal';
import { TENANT_STATUS, PLAN_CODES, TENANT_ACTIONS } from '../utils/constants';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  contact_email: string;
  plan_id: string;
  plan_name: string;
  plan_code: string;
  is_active: boolean;
  status: typeof TENANT_STATUS[keyof typeof TENANT_STATUS];
  user_count: string;
  branch_count: string;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  code: string;
}

const AdminTenants: React.FC = () => {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    tenant: Tenant | null;
    action: typeof TENANT_ACTIONS[keyof typeof TENANT_ACTIONS]
  }>({ isOpen: false, tenant: null, action: TENANT_ACTIONS.APPROVE });

  const fetchData = async () => {
    try {
      const [tenantsRes, plansRes, statsRes] = await Promise.all([
        api.get('/admin/tenants'),
        api.get('/admin/plans'),
        api.get('/admin/stats')
      ]);
      setTenants(tenantsRes.data);
      setPlans(plansRes.data);
      setStats(statsRes.data);
    } catch (error) {
      handleApiError(error, t);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmModal.tenant) return;
    const newStatus = confirmModal.action === TENANT_ACTIONS.SUSPEND ? TENANT_STATUS.SUSPENDED : TENANT_STATUS.ACTIVE;
    try {
      await api.patch(`/admin/tenants/${confirmModal.tenant.id}`, { status: newStatus });
      toast.success(t('common.success'));
      setConfirmModal({ ...confirmModal, isOpen: false });
      fetchData();
    } catch (error) {
      handleApiError(error, t);
    }
  };

  const handleOpenPlanModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setNewPlanId(tenant.plan_id);
    setIsPlanModalOpen(true);
  };

  const handleUpdatePlan = async () => {
    if (!selectedTenant) return;
    try {
      await api.patch(`/admin/tenants/${selectedTenant.id}`, { planId: newPlanId });
      toast.success(t('common.success'));
      setIsPlanModalOpen(false);
      fetchData();
    } catch (error) {
      handleApiError(error, t);
    }
  };

  if (loading) return (
    <div className="flex justify-center p-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-gray-700 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg ${confirmModal.action === TENANT_ACTIONS.SUSPEND ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}>
              {confirmModal.action === TENANT_ACTIONS.SUSPEND ? <XCircle size={40} strokeWidth={2.5} /> : <CheckCircle size={40} strokeWidth={2.5} />}
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {confirmModal.action === TENANT_ACTIONS.APPROVE ? t('admin.approveConfirmTitle') :
                confirmModal.action === TENANT_ACTIONS.SUSPEND ? t('admin.suspendConfirmTitle') :
                  t('admin.activateConfirmTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              {confirmModal.action === TENANT_ACTIONS.SUSPEND ? t('admin.suspendConfirm') :
                t('admin.approveConfirm')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmAction}
                className={`w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${confirmModal.action === TENANT_ACTIONS.SUSPEND ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                  }`}
              >
                {confirmModal.action === 'suspend' ? t('admin.deactivate') : t('admin.confirm')}
              </button>
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="w-full py-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
              <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                <Shield size={12} /> Super Admin
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-lg">
            {t('admin.tenantsSubtitle') || 'Quản lý và phê duyệt các tổ chức tham gia hệ thống'}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <StatCard
            label={t('admin.stats.totalTenants')}
            value={stats?.totalTenants}
            icon={<Building size={18} />}
            color="blue"
          />
          <StatCard
            label={t('admin.stats.totalUsers')}
            value={stats?.totalUsers}
            icon={<Users size={18} />}
            color="indigo"
          />
          <StatCard
            label={t('admin.stats.totalSessions')}
            value={stats?.totalSessions}
            icon={<Calendar size={18} />}
            color="emerald"
            className="col-span-2 lg:col-span-1"
          />
        </div>
      </div>

      {/* Main Content: Table on Desktop, Cards on Mobile */}
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('admin.organization')}</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('admin.plan')}</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('admin.userCount')} / {t('admin.branchCount')}</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('admin.status')}</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300">
                        <Building size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{tenant.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tenant.contact_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center whitespace-nowrap px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm border ${tenant.plan_code === PLAN_CODES.FREE ? 'bg-gray-50 text-gray-600 border-gray-100' :
                      tenant.plan_code === PLAN_CODES.PRO ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        tenant.plan_code === PLAN_CODES.BUSINESS ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                      {t(`admin.planNames.${tenant.plan_code.toUpperCase()}`, tenant.plan_name)}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Users size={14} className="text-primary" /> {tenant.user_count}</span>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-1"><Building size={14} className="text-primary" /> {tenant.branch_count}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <StatusBadge status={tenant.status} t={t} />
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      {tenant.status === TENANT_STATUS.PENDING && (
                        <button
                          onClick={() => setConfirmModal({ isOpen: true, tenant, action: TENANT_ACTIONS.APPROVE })}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                          {t('admin.approve')}
                        </button>
                      )}
                      {tenant.status !== TENANT_STATUS.PENDING && (
                        <button
                          onClick={() => handleOpenPlanModal(tenant)}
                          className="w-9 h-9 flex items-center justify-center text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title={t('admin.changePlan')}
                        >
                          <Zap size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmModal({
                          isOpen: true,
                          tenant,
                          action: (tenant.status === TENANT_STATUS.ACTIVE || tenant.status === TENANT_STATUS.PENDING) ? TENANT_ACTIONS.SUSPEND : TENANT_ACTIONS.ACTIVATE
                        })}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${tenant.status === TENANT_STATUS.ACTIVE || tenant.status === TENANT_STATUS.PENDING ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                        title={(tenant.status === TENANT_STATUS.ACTIVE || tenant.status === TENANT_STATUS.PENDING) ? t('admin.deactivate') : t('admin.activate')}
                      >
                        {(tenant.status === TENANT_STATUS.ACTIVE || tenant.status === TENANT_STATUS.PENDING) ? <XCircle size={18} /> : <CheckCircle size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile View: Compact Card Layout */}
        <div className="lg:hidden space-y-3 p-3">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                    <Building size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate leading-tight">{tenant.name}</h3>
                    <p className="text-[10px] text-primary font-medium truncate mt-0.5">{tenant.contact_email}</p>
                  </div>
                </div>
                <StatusBadge status={tenant.status} t={t} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">{t('admin.plan')}</p>
                  <p className="text-primary truncate uppercase">{t(`admin.planNames.${tenant.plan_code.toUpperCase()}`, tenant.plan_name)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Quy mô</p>
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <Users size={10} /> {tenant.user_count}
                    <span className="opacity-20">|</span>
                    <Building size={10} /> {tenant.branch_count}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {tenant.status === TENANT_STATUS.PENDING ? (
                  <button
                    onClick={() => setConfirmModal({ isOpen: true, tenant, action: TENANT_ACTIONS.APPROVE })}
                    className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm"
                  >
                    {t('admin.approve')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenPlanModal(tenant)}
                    className="flex-1 py-2.5 bg-primary/5 text-primary rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 border border-primary/10"
                  >
                    <Zap size={14} /> {t('admin.changePlan')}
                  </button>
                )}
                <button
                  onClick={() => setConfirmModal({
                    isOpen: true,
                    tenant,
                    action: (tenant.status === TENANT_STATUS.ACTIVE || tenant.status === TENANT_STATUS.PENDING) ? TENANT_ACTIONS.SUSPEND : TENANT_ACTIONS.ACTIVATE
                  })}
                  className={`px-3 py-2.5 rounded-xl transition-all ${tenant.status === TENANT_STATUS.ACTIVE || tenant.status === TENANT_STATUS.PENDING ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}
                >
                  {(tenant.status === TENANT_STATUS.ACTIVE || tenant.status === TENANT_STATUS.PENDING) ? <XCircle size={18} /> : <CheckCircle size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Update Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={t('admin.editPlan')}
      >
        <div className="p-2 space-y-6">
          <div className="flex items-center gap-4 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Building size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">{t('admin.tenantName')}</p>
              <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{selectedTenant?.name}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('admin.plan')}</label>
            <div className="grid grid-cols-1 gap-2">
              {plans.map(p => {
                const isSelected = newPlanId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setNewPlanId(p.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${p.code === PLAN_CODES.FREE ? 'bg-gray-100 text-gray-400' :
                        p.code === PLAN_CODES.PRO ? 'bg-blue-500 text-white shadow-blue-500/20' :
                          p.code === PLAN_CODES.BUSINESS ? 'bg-purple-600 text-white shadow-purple-600/20' :
                            'bg-amber-500 text-white shadow-amber-500/20'
                      }`}>
                      {p.code === PLAN_CODES.FREE && <Building size={20} />}
                      {p.code === PLAN_CODES.PRO && <Zap size={20} fill="currentColor" />}
                      {p.code === PLAN_CODES.BUSINESS && <Shield size={20} fill="currentColor" />}
                      {p.code === PLAN_CODES.ENTERPRISE && <Crown size={20} fill="currentColor" />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                        {t(`admin.planNames.${p.code.toUpperCase()}`, p.name)}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.code}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white">
                        <CheckCircle size={14} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsPlanModalOpen(false)}
              className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleUpdatePlan}
              className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: any; icon: React.ReactNode; color: string; className?: string }> = ({ label, value, icon, color, className }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
  };

  return (
    <div className={`bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-lg shadow-gray-200/40 dark:shadow-none border border-gray-100 dark:border-gray-700 transition-all hover:scale-[1.02] duration-300 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">{label}</p>
          <h3 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter truncate">{value || 0}</h3>
        </div>
        <div className={`p-2 sm:p-4 rounded-xl sm:rounded-3xl border shrink-0 ${colors[color] || colors.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string; t: any }> = ({ status, t }) => {
  if (status === TENANT_STATUS.ACTIVE) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800">
        <CheckCircle size={12} /> {t('admin.statusActive')}
      </span>
    );
  }
  if (status === TENANT_STATUS.PENDING) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800">
        <Clock size={12} /> {t('common.pending')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-800">
      <XCircle size={12} /> {t('admin.statusDisabled')}
    </span>
  );
};

export default AdminTenants;

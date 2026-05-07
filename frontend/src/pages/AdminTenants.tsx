import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHelper';
import { Shield, Building, Users, Calendar, CheckCircle, XCircle, Zap } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-gray-700 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${
              confirmModal.action === TENANT_ACTIONS.SUSPEND ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
            }`}>
              {confirmModal.action === TENANT_ACTIONS.SUSPEND ? <XCircle size={40} /> : <CheckCircle size={40} />}
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
                className={`w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${
                  confirmModal.action === TENANT_ACTIONS.SUSPEND ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label={t('admin.stats.totalTenants')}
          value={stats?.totalTenants}
          icon={<Building className="text-blue-600" size={24} />}
          bgColor="bg-blue-50"
        />
        <StatCard
          label={t('admin.stats.totalUsers')}
          value={stats?.totalUsers}
          icon={<Users className="text-indigo-600" size={24} />}
          bgColor="bg-indigo-50"
        />
        <StatCard
          label={t('admin.stats.totalSessions')}
          value={stats?.totalSessions}
          icon={<Calendar className="text-green-600" size={24} />}
          bgColor="bg-green-50"
        />
      </div>

      {/* Tenants Table */}
      <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Shield size={24} className="text-primary" /> {t('admin.tenantsTitle')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.tenantName')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.plan')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.userCount')} / {t('admin.branchCount')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.status')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-all group">
                  <td className="px-8 py-6">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{tenant.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tenant.contact_email}</div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${tenant.plan_code === PLAN_CODES.FREE ? 'bg-gray-100 text-gray-600' :
                        tenant.plan_code === PLAN_CODES.PRO ? 'bg-blue-100 text-blue-600' :
                          tenant.plan_code === PLAN_CODES.BUSINESS ? 'bg-purple-100 text-purple-600' :
                            'bg-orange-100 text-orange-600'
                      }`}>
                      {t(`admin.planNames.${tenant.plan_code.toUpperCase()}`, tenant.plan_name)}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400">
                    <span className="text-primary">{tenant.user_count}</span> {t('admin.userCount')} / <span className="text-primary">{tenant.branch_count}</span> {t('admin.branchCount')}
                  </td>
                  <td className="px-8 py-6">
                    {tenant.status === TENANT_STATUS.ACTIVE ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <CheckCircle size={12} /> {t('admin.statusActive')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
                        <XCircle size={12} /> {t('admin.statusDisabled')}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3">
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
                          className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all"
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
                        className={`p-2 rounded-xl transition-all ${tenant.status === TENANT_STATUS.ACTIVE || tenant.status === TENANT_STATUS.PENDING ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
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
      </div>

      {/* Plan Update Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={t('admin.editPlan')}
      >
        <div className="p-2 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Building size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-black uppercase tracking-widest">{t('admin.tenantName')}</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{selectedTenant?.name}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('admin.plan')}</label>
            <select
              value={newPlanId}
              onChange={(e) => setNewPlanId(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 px-6 font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {t(`admin.planNames.${p.code.toUpperCase()}`, p.name)}
                </option>
              ))}
            </select>
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

const StatCard: React.FC<{ label: string; value: any; icon: React.ReactNode; bgColor: string }> = ({ label, value, icon, bgColor }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl shadow-gray-200/30 dark:shadow-none border border-gray-100 dark:border-gray-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-1 tracking-tighter">{value || 0}</h3>
      </div>
      <div className={`p-4 ${bgColor} dark:bg-opacity-10 rounded-2xl`}>
        {icon}
      </div>
    </div>
  </div>
);

export default AdminTenants;

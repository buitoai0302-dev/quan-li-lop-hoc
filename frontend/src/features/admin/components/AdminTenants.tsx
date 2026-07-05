import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { handleApiError } from '@/utils/errorHelper';
import {
  Shield,
  Building,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Zap,
  Clock,
  Crown,
  Search,
} from 'lucide-react';
import { Modal, Card, Button, Badge } from '@/components/common/UI';
import { TENANT_STATUS, PLAN_CODES, TENANT_ACTIONS, SYSTEM_DOMAIN } from '@/utils/constants';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import type { Tenant } from '@/types';

import { useAdminTenants, useAdminPlans, useAdminStats, useUpdateTenant } from '../hooks/useAdmin';

const AdminTenants: React.FC = () => {
  const { t } = useTranslation();

  const { data: tenants = [], isLoading: loadingTenants } = useAdminTenants();
  const { data: plans = [], isLoading: loadingPlans } = useAdminPlans();
  const { data: stats, isLoading: loadingStats } = useAdminStats();

  const { mutate: updateTenantMutate } = useUpdateTenant();

  const loading = loadingTenants || loadingPlans || loadingStats;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    tenant: Tenant | null;
    action: (typeof TENANT_ACTIONS)[keyof typeof TENANT_ACTIONS];
  }>({ isOpen: false, tenant: null, action: TENANT_ACTIONS.APPROVE });

  const filteredTenants = useMemo(() => {
    return tenants.filter(
      (t) => t.domain !== SYSTEM_DOMAIN && t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tenants, searchTerm]);

  const handleConfirmAction = () => {
    if (!confirmModal.tenant) return;
    const newStatus =
      confirmModal.action === TENANT_ACTIONS.SUSPEND
        ? TENANT_STATUS.SUSPENDED
        : TENANT_STATUS.ACTIVE;

    updateTenantMutate(
      { id: confirmModal.tenant.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success(t('common.success'));
          setConfirmModal({ ...confirmModal, isOpen: false });
        },
        onError: (error: any) => handleApiError(error, t),
      }
    );
  };

  const handleOpenPlanModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setNewPlanId(tenant.plan_id);
    setIsPlanModalOpen(true);
  };

  const handleUpdatePlan = () => {
    if (!selectedTenant) return;
    updateTenantMutate(
      { id: selectedTenant.id, data: { plan_id: newPlanId } },
      {
        onSuccess: () => {
          toast.success(t('common.success'));
          setIsPlanModalOpen(false);
        },
        onError: (error: any) => handleApiError(error, t),
      }
    );
  };

  if (loading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={Shield}
        actions={
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
              <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                <Shield size={12} /> {t('common.roles.super_admin')}
              </span>
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col px-1">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-4 sm:space-y-6 min-h-0 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 shrink-0">
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
              className="sm:col-span-2 lg:col-span-1"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="relative w-full sm:max-w-md flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="hidden sm:block ml-auto px-4">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                {filteredTenants.length} {t('admin.organization')}
              </span>
            </div>
          </div>

          <Card className="flex-1 min-h-0 overflow-hidden" scrollable={true}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.organization')}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.plan')}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.userCount')} / {t('admin.branchCount')}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.status')}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                        {t('common.noResults')}
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr
                        key={tenant.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 border border-gray-100 dark:border-gray-700 group-hover:scale-105 transition-transform">
                              <Building size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                  {tenant.name}
                                </div>
                                {tenant.domain === SYSTEM_DOMAIN && (
                                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded tracking-widest border border-primary/20">
                                    System
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                                {tenant.contact_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 truncate uppercase tracking-tighter">
                            {t(`admin.planNames.${(tenant.plan_code || 'FREE').toUpperCase()}`, {
                              defaultValue: tenant.plan_code || 'FREE',
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                              <Users size={14} className="text-primary" /> {tenant.user_count}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Building size={14} className="text-primary" /> {tenant.branch_count}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge status={tenant.status} t={t} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-1.5">
                            {tenant.domain === SYSTEM_DOMAIN ? (
                              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                                <Shield size={14} /> {t('common.roles.super_admin')}
                              </div>
                            ) : (
                              <>
                                {tenant.status === TENANT_STATUS.PENDING && (
                                  <button
                                    onClick={() =>
                                      setConfirmModal({
                                        isOpen: true,
                                        tenant,
                                        action: TENANT_ACTIONS.APPROVE,
                                      })
                                    }
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                                  >
                                    {t('admin.approve')}
                                  </button>
                                )}
                                {tenant.status === TENANT_STATUS.ACTIVE && (
                                  <button
                                    onClick={() => {
                                      localStorage.setItem('impersonatedTenantId', tenant.id);
                                      localStorage.setItem('impersonatedTenantName', tenant.name);
                                      window.location.href = '/';
                                    }}
                                    className="px-3 h-9 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center"
                                    title={t('admin.manageTenant', 'Quản lý Center')}
                                  >
                                    {t('admin.manage', 'Quản lý')}
                                  </button>
                                )}
                                {tenant.status !== TENANT_STATUS.PENDING && (
                                  <button
                                    onClick={() => handleOpenPlanModal(tenant)}
                                    className="w-9 h-9 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-all"
                                    title={t('admin.changePlan')}
                                  >
                                    <Zap size={18} />
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      tenant,
                                      action:
                                        tenant.status === TENANT_STATUS.ACTIVE ||
                                        tenant.status === TENANT_STATUS.PENDING
                                          ? TENANT_ACTIONS.SUSPEND
                                          : TENANT_ACTIONS.ACTIVATE,
                                    })
                                  }
                                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${tenant.status === TENANT_STATUS.ACTIVE || tenant.status === TENANT_STATUS.PENDING ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                  title={
                                    tenant.status === TENANT_STATUS.ACTIVE ||
                                    tenant.status === TENANT_STATUS.PENDING
                                      ? t('admin.deactivate')
                                      : t('admin.activate')
                                  }
                                >
                                  {tenant.status === TENANT_STATUS.ACTIVE ||
                                  tenant.status === TENANT_STATUS.PENDING ? (
                                    <XCircle size={18} />
                                  ) : (
                                    <CheckCircle size={18} />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-gray-700 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ${
                confirmModal.action === TENANT_ACTIONS.SUSPEND
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}
            >
              {confirmModal.action === TENANT_ACTIONS.SUSPEND ? (
                <XCircle size={40} strokeWidth={2.5} />
              ) : (
                <CheckCircle size={40} strokeWidth={2.5} />
              )}
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {confirmModal.action === TENANT_ACTIONS.APPROVE
                ? t('admin.approveConfirmTitle')
                : confirmModal.action === TENANT_ACTIONS.SUSPEND
                  ? t('admin.suspendConfirmTitle')
                  : t('admin.activateConfirmTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              {confirmModal.action === TENANT_ACTIONS.SUSPEND
                ? t('admin.suspendConfirm')
                : t('admin.approveConfirm')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmAction}
                className={`w-full py-4 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${
                  confirmModal.action === TENANT_ACTIONS.SUSPEND
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                }`}
              >
                {confirmModal.action === 'suspend' ? t('admin.deactivate') : t('admin.confirm')}
              </button>
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="w-full py-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Update Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={t('admin.editPlan')}
      >
        <div className="p-2 space-y-6">
          <div className="flex items-center gap-4 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
              <Building size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">
                {t('admin.tenantName')}
              </p>
              <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                {selectedTenant?.name}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              {t('admin.plan')}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {plans.map((p) => {
                const isSelected = newPlanId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setNewPlanId(p.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                        p.code === PLAN_CODES.FREE
                          ? 'bg-gray-100 text-gray-400'
                          : p.code === PLAN_CODES.PRO
                            ? 'bg-blue-500 text-white shadow-blue-500/20'
                            : p.code === PLAN_CODES.BUSINESS
                              ? 'bg-purple-600 text-white shadow-purple-600/20'
                              : 'bg-amber-500 text-white shadow-amber-500/20'
                      }`}
                    >
                      {p.code === PLAN_CODES.FREE && <Building size={20} />}
                      {p.code === PLAN_CODES.PRO && <Zap size={20} fill="currentColor" />}
                      {p.code === PLAN_CODES.BUSINESS && <Shield size={20} fill="currentColor" />}
                      {p.code === PLAN_CODES.ENTERPRISE && <Crown size={20} fill="currentColor" />}
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}
                      >
                        {t(`admin.planNames.${p.code.toUpperCase()}`, p.name)}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {p.code}
                      </p>
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
            <Button
              variant="outline"
              onClick={() => setIsPlanModalOpen(false)}
              className="flex-1 uppercase tracking-widest text-xs"
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdatePlan} className="flex-1 uppercase tracking-widest text-xs">
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: any;
  icon: React.ReactNode;
  color: string;
  className?: string;
}> = ({ label, value, icon, color, className }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
    indigo:
      'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800',
    emerald:
      'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg shadow-gray-200/20 dark:shadow-none border border-gray-100 dark:border-gray-700 transition-all hover:scale-[1.02] duration-300 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 truncate">
            {label}
          </p>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter truncate">
            {value || 0}
          </h3>
        </div>
        <div className={`p-4 rounded-2xl border shrink-0 ${colors[color] || colors.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string; t: any }> = ({ status, t }) => {
  if (status === TENANT_STATUS.ACTIVE) {
    return (
      <Badge variant="success" className="gap-1.5 px-3 py-1 text-[10px]">
        <CheckCircle size={12} /> {t('admin.statusActive')}
      </Badge>
    );
  }
  if (status === TENANT_STATUS.PENDING) {
    return (
      <Badge variant="warning" className="gap-1.5 px-3 py-1 text-[10px]">
        <Clock size={12} /> {t('common.pending')}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-[10px]">
      <XCircle size={12} /> {t('admin.statusDisabled')}
    </Badge>
  );
};

export default AdminTenants;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Clock, Building, Zap, Crown, Shield, FileText } from 'lucide-react';
import { getPlanRequests, approvePlanRequest, rejectPlanRequest } from '@/features/admin';
import toast from 'react-hot-toast';
import { PLAN_REQUEST_STATUS, PLAN_REQUEST_ACTIONS } from '@/utils/constants';
import PageHeader from '@/components/common/PageHeader';
import { Card, Badge, Button } from '@/components/common/UI';
import PageLoading from '@/components/common/PageLoading';
import type { PlanRequest } from '@/types';
import EmptyState from '@/components/common/EmptyState';

const AdminPlanRequests: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string | null;
    action: (typeof PLAN_REQUEST_ACTIONS)[keyof typeof PLAN_REQUEST_ACTIONS];
  }>({ isOpen: false, id: null, action: PLAN_REQUEST_ACTIONS.APPROVE });

  const fetchRequests = async () => {
    try {
      const data = await getPlanRequests();
      setRequests(data);
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async () => {
    if (!confirmModal.id) return;
    try {
      if (confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE) {
        await approvePlanRequest(confirmModal.id);
      } else {
        await rejectPlanRequest(confirmModal.id);
      }
      toast.success(t('common.success'));
      setConfirmModal({ isOpen: false, id: null, action: PLAN_REQUEST_ACTIONS.APPROVE });
      fetchRequests();
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case PLAN_REQUEST_STATUS.PENDING:
        return t('common.pending');
      case PLAN_REQUEST_STATUS.APPROVED:
        return t('common.active');
      case PLAN_REQUEST_STATUS.REJECTED:
        return t('common.inactive');
      default:
        return status;
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={FileText}
        actions={
          <div className="bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20">
            <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1.5 sm:gap-2">
              <Clock size={12} className="animate-pulse" />{' '}
              <span className="font-bold">
                {requests.filter((r) => r.status === PLAN_REQUEST_STATUS.PENDING).length}
              </span>{' '}
              <span className="hidden sm:inline">{t('admin.pendingRequests')}</span>
            </span>
          </div>
        }
      />

      <div className="flex-1 overflow-auto custom-scrollbar px-1">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-hidden" scrollable={true}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.organization')}
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 sm:px-6 sm:py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.plan')}
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('common.status')}
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 sm:px-6 sm:py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.createdAt')}
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12">
                        <EmptyState
                          title={t('common.noData')}
                          description={t('admin.noPlanRequests')}
                          icon={Clock}
                        />
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr
                        key={req.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group"
                      >
                        <td className="px-3 py-3 sm:px-6 sm:py-5 whitespace-nowrap">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30 shadow-sm shrink-0">
                              <Building size={16} className="sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-gray-900 dark:text-white text-xs sm:text-sm leading-tight truncate">
                                {req.tenant_name}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mt-0.5 sm:mt-1">
                                <p className="text-[10px] text-primary font-bold truncate">
                                  {req.contact_email}
                                </p>
                                <span className="sm:hidden px-1.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[8px] font-black uppercase rounded tracking-widest border border-blue-200 dark:border-blue-800 shrink-0 w-fit">
                                  {t(
                                    `admin.planNames.${(req.plan_name || 'FREE').split(' ')[0].toUpperCase()}`
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 sm:px-6 sm:py-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm border ${
                                req.plan_name?.includes('Pro')
                                  ? 'bg-amber-50 text-amber-500 border-amber-100'
                                  : req.plan_name?.includes('Business')
                                    ? 'bg-blue-50 text-blue-500 border-blue-100'
                                    : 'bg-purple-50 text-purple-500 border-purple-100'
                              }`}
                            >
                              {req.plan_name?.includes('Pro') && (
                                <Zap size={18} fill="currentColor" />
                              )}
                              {req.plan_name?.includes('Business') && (
                                <Shield size={18} fill="currentColor" />
                              )}
                              {req.plan_name?.includes('Enterprise') && (
                                <Crown size={18} fill="currentColor" />
                              )}
                            </div>
                            <span className="font-black text-gray-700 dark:text-gray-200 text-[11px] uppercase tracking-tight">
                              {t(
                                `admin.planNames.${(req.plan_name || 'FREE').split(' ')[0].toUpperCase()}`
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-5">
                          <RequestStatusBadge status={req.status} labelFunc={getStatusLabel} />
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 sm:px-6 sm:py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                              {new Date(req.created_at).toLocaleDateString(
                                i18n.language === 'vi' ? 'vi-VN' : 'en-US'
                              )}
                            </span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                              {new Date(req.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-5 text-right">
                          {req.status === PLAN_REQUEST_STATUS.PENDING && (
                            <div className="flex justify-end gap-1.5 sm:gap-2">
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    id: req.id,
                                    action: PLAN_REQUEST_ACTIONS.APPROVE,
                                  })
                                }
                                className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 px-2 sm:px-3 flex items-center justify-center gap-0 sm:gap-1.5"
                              >
                                <Check size={14} strokeWidth={4} />
                                <span className="hidden sm:inline">{t('admin.approve')}</span>
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    id: req.id,
                                    action: PLAN_REQUEST_ACTIONS.REJECT,
                                  })
                                }
                                className="shadow-rose-500/30 px-2 sm:px-3 flex items-center justify-center gap-0 sm:gap-1.5"
                              >
                                <X size={14} strokeWidth={4} />
                                <span className="hidden sm:inline">{t('admin.reject')}</span>
                              </Button>
                            </div>
                          )}
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
                confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
              }`}
            >
              {confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? (
                <Shield size={40} strokeWidth={2.5} />
              ) : (
                <X size={40} strokeWidth={2.5} />
              )}
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE
                ? t('admin.approveConfirmTitle')
                : t('admin.rejectConfirmTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              {confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE
                ? t('admin.approveConfirm')
                : t('admin.rejectConfirm')}
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleApprove}
                variant={
                  confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? 'default' : 'destructive'
                }
                className={`w-full py-6 uppercase tracking-[0.2em] text-xs ${confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : ''}`}
              >
                {confirmModal.action === 'approve' ? t('admin.approve') : t('admin.reject')}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setConfirmModal({ isOpen: false, id: null, action: PLAN_REQUEST_ACTIONS.APPROVE })
                }
                className="w-full py-6 uppercase tracking-[0.2em] text-xs"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RequestStatusBadge: React.FC<{ status: string; labelFunc: (s: string) => string }> = ({
  status,
  labelFunc,
}) => {
  const isPending = status === PLAN_REQUEST_STATUS.PENDING;
  const isApproved = status === PLAN_REQUEST_STATUS.APPROVED;

  return (
    <Badge
      variant={isPending ? 'warning' : isApproved ? 'success' : 'destructive'}
      className="gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-4 sm:py-1.5 text-[8px] sm:text-[10px] whitespace-nowrap"
    >
      {isPending && <Clock size={10} className="sm:w-3 sm:h-3" />}
      {isApproved && <Check size={10} className="sm:w-3 sm:h-3" />}
      {!isPending && !isApproved && <X size={10} className="sm:w-3 sm:h-3" />}
      {labelFunc(status)}
    </Badge>
  );
};

export default AdminPlanRequests;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Clock, Building, Zap, Crown, Shield, FileText } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import { PLAN_REQUEST_STATUS, PLAN_REQUEST_ACTIONS } from '../../utils/constants';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import PageLoading from '../../components/common/PageLoading';
import type { PlanRequest } from '../../types';
import EmptyState from '../../components/common/EmptyState';



const AdminPlanRequests: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string | null; action: typeof PLAN_REQUEST_ACTIONS[keyof typeof PLAN_REQUEST_ACTIONS] }>({ isOpen: false, id: null, action: PLAN_REQUEST_ACTIONS.APPROVE });

  const fetchRequests = async () => {
    try {
      const res = await api.get('/plans/requests');
      setRequests(res.data);
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
        await api.post(`/plans/requests/${confirmModal.id}/approve`);
      } else {
        await api.post(`/plans/requests/${confirmModal.id}/reject`);
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
      case PLAN_REQUEST_STATUS.PENDING: return t('common.pending');
      case PLAN_REQUEST_STATUS.APPROVED: return t('common.active');
      case PLAN_REQUEST_STATUS.REJECTED: return t('common.inactive');
      default: return status;
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader 
        icon={FileText}
        actions={
          <div className="bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20">
            <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2">
              <Clock size={12} className="animate-pulse" /> {requests.filter(r => r.status === PLAN_REQUEST_STATUS.PENDING).length} {t('admin.pendingRequests')}
            </span>
          </div>
        }
      />

      <div className="flex-1 overflow-auto custom-scrollbar px-1">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-hidden" scrollable={true}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.organization')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.plan')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.status')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.createdAt')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
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
                      <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                              <Building size={22} />
                            </div>
                            <div>
                              <p className="font-black text-gray-900 dark:text-white text-sm leading-tight">{req.tenant_name}</p>
                              <p className="text-[10px] text-primary font-bold mt-1">{req.contact_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm border ${req.plan_name.includes('Pro') ? 'bg-amber-50 text-amber-500 border-amber-100' :
                              req.plan_name.includes('Business') ? 'bg-blue-50 text-blue-500 border-blue-100' :
                                'bg-purple-50 text-purple-500 border-purple-100'
                              }`}>
                              {req.plan_name.includes('Pro') && <Zap size={18} fill="currentColor" />}
                              {req.plan_name.includes('Business') && <Shield size={18} fill="currentColor" />}
                              {req.plan_name.includes('Enterprise') && <Crown size={18} fill="currentColor" />}
                            </div>
                            <span className="font-black text-gray-700 dark:text-gray-200 text-[11px] uppercase tracking-tight">
                              {t(`admin.planNames.${req.plan_name.split(' ')[0].toUpperCase()}`)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <RequestStatusBadge status={req.status} labelFunc={getStatusLabel} />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                              {new Date(req.created_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                            </span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                              {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          {req.status === PLAN_REQUEST_STATUS.PENDING && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setConfirmModal({ isOpen: true, id: req.id, action: PLAN_REQUEST_ACTIONS.APPROVE })}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/30"
                              >
                                <Check size={14} strokeWidth={4} /> {t('admin.approve')}
                              </button>
                              <button
                                onClick={() => setConfirmModal({ isOpen: true, id: req.id, action: PLAN_REQUEST_ACTIONS.REJECT })}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-rose-500/30"
                              >
                                <X size={14} strokeWidth={4} /> {t('admin.reject')}
                              </button>
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
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ${confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
              }`}>
              {confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? <Shield size={40} strokeWidth={2.5} /> : <X size={40} strokeWidth={2.5} />}
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? t('admin.approveConfirmTitle') : t('admin.rejectConfirmTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              {confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? t('admin.approveConfirm') : t('admin.rejectConfirm')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleApprove}
                className={`w-full py-4 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'
                  }`}
              >
                {confirmModal.action === 'approve' ? t('admin.approve') : t('admin.reject')}
              </button>
              <button
                onClick={() => setConfirmModal({ isOpen: false, id: null, action: PLAN_REQUEST_ACTIONS.APPROVE })}
                className="w-full py-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RequestStatusBadge: React.FC<{ status: string; labelFunc: any }> = ({ status, labelFunc }) => {
  const isPending = status === PLAN_REQUEST_STATUS.PENDING;
  const isApproved = status === PLAN_REQUEST_STATUS.APPROVED;

  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${isPending ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
      isApproved ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white' :
        'bg-gradient-to-r from-rose-400 to-red-500 text-white'
      }`}>
      {isPending && <Clock size={12} />}
      {isApproved && <Check size={12} />}
      {!isPending && !isApproved && <X size={12} />}
      {labelFunc(status)}
    </span>
  );
};

export default AdminPlanRequests;

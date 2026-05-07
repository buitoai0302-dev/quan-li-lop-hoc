import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Clock, Building, Zap, Crown, Shield } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { PLAN_REQUEST_STATUS, PLAN_REQUEST_ACTIONS } from '../utils/constants';

interface PlanRequest {
  id: string;
  tenant_name: string;
  contact_email: string;
  plan_name: string;
  status: typeof PLAN_REQUEST_STATUS[keyof typeof PLAN_REQUEST_STATUS];
  notes: string;
  created_at: string;
}

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

  if (loading) return (
    <div className="flex justify-center p-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-gray-700 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg ${confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
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
                className={`w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${confirmModal.action === PLAN_REQUEST_ACTIONS.APPROVE ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'
                  }`}
              >
                {confirmModal.action === 'approve' ? t('admin.approve') : t('admin.reject')}
              </button>
              <button
                onClick={() => setConfirmModal({ isOpen: false, id: null, action: PLAN_REQUEST_ACTIONS.APPROVE })}
                className="w-full py-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
            <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2">
              <Clock size={12} className="animate-pulse" /> {requests.filter(r => r.status === PLAN_REQUEST_STATUS.PENDING).length} {t('admin.pendingRequests')}
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-lg">
          {t('admin.planRequestsSubtitle') || 'Phê duyệt các yêu cầu nâng cấp gói dịch vụ từ đối tác'}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Desktop View: Advanced Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('admin.organization')}</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('admin.plan')}</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('common.status')}</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('admin.createdAt')}</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <div className="w-20 h-20 rounded-full border-4 border-dashed border-gray-400 flex items-center justify-center">
                        <Clock size={40} />
                      </div>
                      <p className="text-xl font-black uppercase tracking-widest">{t('common.noData')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                          <Building size={22} />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 dark:text-white text-base leading-tight">{req.tenant_name}</p>
                          <p className="text-xs text-primary font-bold mt-1">{req.contact_email}</p>
                          <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tighter italic opacity-60">ID: {req.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${req.plan_name.includes('Pro') ? 'bg-amber-50 text-amber-500 border border-amber-100' :
                            req.plan_name.includes('Business') ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                              'bg-purple-50 text-purple-500 border border-purple-100'
                          }`}>
                          {req.plan_name.includes('Pro') && <Zap size={18} fill="currentColor" />}
                          {req.plan_name.includes('Business') && <Shield size={18} fill="currentColor" />}
                          {req.plan_name.includes('Enterprise') && <Crown size={18} fill="currentColor" />}
                        </div>
                        <span className="font-black text-gray-700 dark:text-gray-200 text-sm tracking-tight">
                          {t(`admin.planNames.${req.plan_name.split(' ')[0].toUpperCase()}`, req.plan_name)}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <RequestStatusBadge status={req.status} labelFunc={getStatusLabel} />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                          {new Date(req.created_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                          {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {req.status === PLAN_REQUEST_STATUS.PENDING && (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, id: req.id, action: PLAN_REQUEST_ACTIONS.APPROVE })}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/30"
                          >
                            <Check size={14} strokeWidth={4} /> {t('admin.approve')}
                          </button>
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, id: req.id, action: PLAN_REQUEST_ACTIONS.REJECT })}
                            className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-rose-500/30"
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

        {/* Mobile View: Compact Card Layout */}
        <div className="lg:hidden space-y-3 p-3">
          {requests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-10 text-center rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <Clock size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('common.noData')}</p>
            </div>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                      <Building size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate leading-tight">{req.tenant_name}</h3>
                      <p className="text-[10px] text-primary font-bold truncate mt-0.5">{req.contact_email}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5 opacity-60">ID: {req.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <RequestStatusBadge status={req.status} labelFunc={getStatusLabel} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">{t('admin.plan')}</p>
                    <div className="flex items-center gap-1">
                      <div className={req.plan_name.includes('Pro') ? 'text-amber-500' : req.plan_name.includes('Business') ? 'text-blue-500' : 'text-purple-500'}>
                        {req.plan_name.includes('Pro') && <Zap size={10} fill="currentColor" />}
                        {req.plan_name.includes('Business') && <Shield size={10} fill="currentColor" />}
                        {req.plan_name.includes('Enterprise') && <Crown size={10} fill="currentColor" />}
                      </div>
                      <span className="truncate uppercase text-gray-700 dark:text-gray-200">{req.plan_name}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">{t('admin.createdAt')}</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {new Date(req.created_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                    </p>
                  </div>
                </div>

                {req.status === PLAN_REQUEST_STATUS.PENDING && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setConfirmModal({ isOpen: true, id: req.id, action: PLAN_REQUEST_ACTIONS.APPROVE })}
                      className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                    >
                      {t('admin.approve')}
                    </button>
                    <button
                      onClick={() => setConfirmModal({ isOpen: true, id: req.id, action: PLAN_REQUEST_ACTIONS.REJECT })}
                      className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                    >
                      {t('admin.reject')}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Clock, Building, Zap, Crown, Shield } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

interface PlanRequest {
  id: string;
  tenant_name: string;
  plan_name: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  created_at: string;
}

const AdminPlanRequests: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

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
      await api.post(`/plans/requests/${confirmModal.id}/approve`);
      toast.success(t('common.success'));
      setConfirmModal({ isOpen: false, id: null });
      fetchRequests();
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t('common.pending');
      case 'approved': return t('common.active');
      case 'rejected': return t('common.inactive');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-gray-700 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400">
              <Shield size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {t('admin.approveConfirmTitle', 'Xác nhận Phê duyệt')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              {t('admin.approveConfirm', 'Bạn có chắc chắn muốn phê duyệt yêu cầu nâng cấp này?')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleApprove}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
              >
                {t('admin.approve', 'Phê duyệt Ngay')}
              </button>
              <button
                onClick={() => setConfirmModal({ isOpen: false, id: null })}
                className="w-full py-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
              >
                {t('common.cancel', 'Hủy bỏ')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {t('admin.planRequestsTitle')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.planRequestsSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-800/50 text-sm font-bold">
          <Clock size={18} />
          {requests.filter(r => r.status === 'pending').length} {t('admin.pendingRequests')}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.tenantName')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.plan')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.status')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('admin.createdAt')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <Clock size={48} />
                      <p className="text-lg font-bold">{t('common.noData')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                          <Building size={20} />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 dark:text-white leading-none">{req.tenant_name}</p>
                          <p className="text-xs text-gray-400 mt-1.5 font-medium italic">ID: {req.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${req.plan_name.includes('Pro') ? 'bg-amber-100 text-amber-600' :
                          req.plan_name.includes('Business') ? 'bg-blue-100 text-blue-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                          {req.plan_name.includes('Pro') && <Zap size={16} fill="currentColor" />}
                          {req.plan_name.includes('Business') && <Shield size={16} fill="currentColor" />}
                          {req.plan_name.includes('Enterprise') && <Crown size={16} fill="currentColor" />}
                        </div>
                        <span className="font-bold text-gray-700 dark:text-gray-200">
                          {t(`admin.planNames.${req.plan_name.split(' ')[0].toUpperCase()}`, req.plan_name)}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${req.status === 'pending' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
                        req.status === 'approved' ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white' :
                          'bg-gradient-to-r from-rose-400 to-red-500 text-white'
                        }`}>
                        {req.status === 'pending' && <Clock size={12} />}
                        {req.status === 'approved' && <Check size={12} />}
                        {req.status === 'rejected' && <X size={12} />}
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                          {new Date(req.created_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, id: req.id })}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/30"
                          >
                            <Check size={14} strokeWidth={3} /> {t('admin.approve')}
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
      </div>
    </div>
  );
};

export default AdminPlanRequests;

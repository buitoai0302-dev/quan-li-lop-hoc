import React, { useState, useEffect } from 'react';
import NoResults from '../components/NoResults';
import api from '../api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import { Building, MapPin, Phone, Plus, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../utils/errorHelper';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
}

const Branches: React.FC = () => {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    is_active: true,
  });

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/branches');
      setBranches(response.data);
    } catch (error) {
      toast.error(t('common.error'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const filteredBranches = branches.filter(branch => {
    const query = searchQuery.toLowerCase();
    return branch.name.toLowerCase().includes(query) ||
      (branch.address && branch.address.toLowerCase().includes(query)) ||
      (branch.phone && branch.phone.includes(query));
  });

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingId(branch.id);
      setFormData({
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        is_active: branch.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/branches/${editingId}`, formData);
        toast.success(t('common.success'));
      } else {
        await api.post('/branches', formData);
        toast.success(t('common.success'));
      }
      handleCloseModal();
      fetchBranches();
    } catch (error: any) {
      handleApiError(error, t);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/branches/${deletingId}`);
      toast.success(t('common.success'));
      fetchBranches();
    } catch (error: any) {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-colors">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs order-2 sm:order-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-end gap-2 order-1 sm:order-2">
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-none h-9 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 whitespace-nowrap flex items-center justify-center gap-2 group active:scale-95"
              title={t('branches.addBranch')}
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="sm:inline">{t('branches.addBranch')}</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto -mx-3 sm:-mx-6 px-3 sm:px-6 relative">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <React.Fragment>
          <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-900/90 backdrop-blur-md">
                <th className="w-auto px-2 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('branches.name')}</th>
                <th className="hidden md:table-cell w-[30%] px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('branches.address')}</th>
                <th className="hidden sm:table-cell w-28 px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('branches.phone')}</th>
                <th className="hidden sm:table-cell w-28 px-2 sm:px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('common.status')}</th>
                <th className="w-20 sm:w-28 px-2 sm:px-6 py-3 text-right text-[10px] sm:text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBranches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-2 sm:px-6 py-3">
                    <div className="flex items-center min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="h-9 w-9 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold text-xs">
                          B
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${branch.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">{branch.name}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 md:hidden truncate">
                          {branch.address || '---'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-6 py-3 text-sm text-gray-900 dark:text-gray-300 truncate">
                    {branch.address || '---'}
                  </td>
                  <td className="hidden sm:table-cell px-6 py-3 text-sm text-gray-900 dark:text-gray-300">
                    {branch.phone || '---'}
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-6 py-3 whitespace-nowrap">
                    {branch.is_active ? (
                      <span className="px-1.5 py-0.5 inline-flex text-[9px] leading-3 font-bold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        {t('common.active')}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 inline-flex text-[9px] leading-3 font-bold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {t('common.inactive')}
                      </span>
                    )}
                  </td>
                  <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(branch)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeletingId(branch.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBranches.length === 0 && (
                <NoResults 
                  title={searchQuery ? t('common.noResults') : t('branches.noData')}
                  colSpan={5} 
                />
              )}
            </tbody>
          </table>
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredBranches.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
            }}
          />
        </React.Fragment>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingId ? t('branches.editBranch') : t('branches.addBranch')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Branch Info Section */}
          <div className="bg-cyan-50/50 dark:bg-cyan-900/10 p-4 rounded-2xl border border-cyan-100/50 dark:border-cyan-500/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Building size={16} className="text-cyan-600 dark:text-cyan-400" />
              <span className="text-[10px] font-black text-cyan-600/50 dark:text-cyan-400/50 uppercase tracking-widest">{t('common.info')}</span>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('branches.name')} *</label>
              <input 
                required
                type="text" 
                placeholder={t('branches.namePlaceholder')}
                className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-black text-indigo-600/50 dark:text-indigo-400/50 uppercase tracking-widest">{t('branches.location')}</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('branches.address')}</label>
              <input 
                type="text" 
                placeholder={t('branches.addressPlaceholder')}
                className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('branches.phone')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={14} className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="024xxx..."
                    className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('common.status')}</label>
                <select
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all text-sm font-medium dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                >
                  <option value="true">{t('common.active')}</option>
                  <option value="false">{t('common.inactive')}</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteWarning')}
      />
    </div>
  );
};

export default Branches;

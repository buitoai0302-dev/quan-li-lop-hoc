import React, { useState, useEffect } from 'react';
import NoResults from '../components/NoResults';
import api from '../api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../utils/errorHelper';
import { COMMON_STATUS } from '../utils/constants';
import { User, Mail, Shield, Plus, Upload, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  branch_id: string;
  branch_name?: string;
  is_active: boolean;
  parent_phone?: string;
}

interface Branch {
  id: string;
  name: string;
}

const Students: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
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
  const [branchFilter, setBranchFilter] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    branch_id: '',
    is_active: COMMON_STATUS.ACTIVE,
    parent_phone: '',
  });

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const [studentsRes, branchesRes] = await Promise.all([
        api.get('/students'),
        api.get('/branches')
      ]);
      setStudents(studentsRes.data);
      setBranches(branchesRes.data);

      // Select first branch by default if available
      if (branchesRes.data.length > 0 && !formData.branch_id) {
        setFormData(prev => ({ ...prev, branch_id: branchesRes.data[0].id }));
      }
    } catch (error: any) {
      handleApiError(error, t);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = student.full_name.toLowerCase().includes(query) ||
      (student.email && student.email.toLowerCase().includes(query)) ||
      (student.phone && student.phone.includes(query)) ||
      (student.parent_phone && student.parent_phone.includes(query));

    const matchesBranch = branchFilter === '' || student.branch_id === branchFilter;

    return matchesSearch && matchesBranch;
  });

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingId(student.id);
      setFormData({
        full_name: student.full_name,
        email: student.email,
        phone: student.phone || '',
        date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
        branch_id: student.branch_id || (branches.length > 0 ? branches[0].id : ''),
        is_active: student.is_active,
        parent_phone: student.parent_phone || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        branch_id: branches.length > 0 ? branches[0].id : '',
        is_active: COMMON_STATUS.ACTIVE,
        parent_phone: '',
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
        await api.put(`/students/${editingId}`, formData);
        toast.success(t('common.success'));
      } else {
        await api.post('/students', formData);
        toast.success(t('common.success'));
      }
      handleCloseModal();
      fetchStudents();
    } catch (error: any) {
      handleApiError(error, t);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/students/${deletingId}`);
      toast.success(t('common.success'));
      fetchStudents();
    } catch (error: any) {
      handleApiError(error, t);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-colors">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:max-w-xl order-2 sm:order-1">
            <div className="relative flex-1 sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
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
            <select
              className="w-full sm:w-auto border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-800 transition-all shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">{t('import.selectBranch')}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 order-1 sm:order-2">
            <button
              onClick={() => navigate('/import?type=students')}
              className="flex-1 sm:flex-none h-9 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-200 dark:border-gray-600 whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              title={t('common.import')}
            >
              <Upload size={16} />
              <span className="sm:inline">{t('common.import')}</span>
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-none h-9 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 whitespace-nowrap flex items-center justify-center gap-2 group active:scale-95"
              title={t('students.addStudent')}
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="sm:inline">{t('students.addStudent')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto -mx-3 sm:-mx-6 px-3 sm:px-6 relative custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md">
                <th className="w-auto px-2 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('students.name')}</th>
                <th className="hidden md:table-cell w-[25%] px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('classes.branch')}</th>
                <th className="hidden sm:table-cell w-28 px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('students.dob')}</th>
                <th className="hidden sm:table-cell w-28 px-2 sm:px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('common.status')}</th>
                <th className="w-20 sm:w-28 px-2 sm:px-6 py-3 text-right text-[10px] sm:text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-2 sm:px-6 py-3">
                    <div className="flex items-center min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="h-9 w-9 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center text-primary font-bold text-[10px] sm:text-xs">
                          {student.full_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${student.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">{student.full_name}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{student.email}</div>
                        {student.phone && <div className="text-[10px] text-gray-400 dark:text-gray-500 sm:hidden truncate">{student.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-900 dark:text-gray-300 truncate">
                    {student.branch_name || t('rooms.unknown')}
                  </td>
                  <td className="hidden sm:table-cell px-6 py-3 text-sm text-gray-900 dark:text-gray-300">
                    {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('vi-VN') : '---'}
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-6 py-4 whitespace-nowrap">
                    {student.is_active ? (
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
                      <button onClick={() => handleOpenModal(student)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeletingId(student.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <NoResults
                  title={searchQuery ? t('common.noResults') : t('students.noData')}
                  colSpan={5}
                />
              )}
            </tbody>
          </table>
        )}
      </div>

      {!loading && (
        <div className="border-gray-100 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredStudents.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('students.editStudent') : t('students.addStudent')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Personal Info Section */}
          <div className="bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100/50 dark:border-rose-500/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-rose-600 dark:text-rose-400" />
              <span className="text-[10px] font-black text-rose-600/50 dark:text-rose-400/50 uppercase tracking-widest">{t('common.info')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('students.name')} *</label>
                <input
                  required
                  type="text"
                  placeholder={t('students.namePlaceholder')}
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('students.dob')}</label>
                <input
                  type="date"
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('classes.branch')} *</label>
                <select
                  required
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-4 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all text-sm font-medium dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                >
                  <option value="" disabled>---</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100/50 dark:border-blue-500/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-black text-blue-600/50 dark:text-blue-400/50 uppercase tracking-widest">{t('common.contact')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('students.email')} *</label>
                <input
                  required
                  type="email"
                  disabled={!!editingId}
                  placeholder="example@email.com"
                  className={`block w-full border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium ${editingId ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'bg-white dark:bg-gray-800 dark:text-white'}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('students.phone')}</label>
                <input
                  type="text"
                  placeholder="09xxx..."
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('students.parentPhone')}</label>
                <input
                  type="text"
                  placeholder="09xxx..."
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Settings Section */}
          {editingId && (
            <div className="bg-gray-50/50 dark:bg-gray-900/10 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-[10px] font-black text-gray-600/50 dark:text-gray-400/50 uppercase tracking-widest">{t('common.settings')}</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('common.status')}</label>
                <select
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all text-sm font-medium dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                >
                  <option value="true">{t('common.active')}</option>
                  <option value="false">{t('common.inactive')}</option>
                </select>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 px-4 bg-primary text-white rounded-lg text-sm font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50"
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

export default Students;

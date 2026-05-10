import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../../utils/errorHelper';
import { UserCheck, Plus, Upload, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import PageLoading from '../../components/common/PageLoading';
import FilterBar from '../../components/common/FilterBar';
import FilterSelect from '../../components/common/FilterSelect';
import EmptyState from '../../components/common/EmptyState';
import type { Teacher } from '../../types';


import TeacherTable from './components/TeacherTable';
import TeacherForm from './components/TeacherForm';

import { useTeachers } from '../../hooks/useTeachers';
import { useBranches } from '../../hooks/useBranches';

const Teachers: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { teachers, loading: teachersLoading, refreshTeachers } = useTeachers();
  const { branches, loading: branchesLoading } = useBranches();

  const loading = teachersLoading || branchesLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);

  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialization: '',
    branch_id: '',
    is_active: true,
  });

  useEffect(() => {
    if (branches.length > 0 && !formData.branch_id) {
      const defaultBranchId = user?.branch_id || branches[0].id;
      setFormData(prev => ({ ...prev, branch_id: defaultBranchId }));
    }
  }, [branches, user, formData.branch_id]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const matchesSearch =
        teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.phone && teacher.phone.includes(searchTerm));

      const matchesBranch = branchFilter === '' || teacher.branch_id === branchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [teachers, searchTerm, branchFilter]);

  const handleOpenModal = useCallback((teacher?: Teacher) => {
    if (teacher) {
      setEditingId(teacher.id);
      setFormData({
        full_name: teacher.full_name,
        email: teacher.email,
        phone: teacher.phone || '',
        specialization: teacher.specialization || '',
        branch_id: teacher.branch_id || (user?.branch_id || (branches.length > 0 ? branches[0].id : '')),
        is_active: teacher.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        specialization: '',
        branch_id: user?.branch_id || (branches.length > 0 ? branches[0].id : ''),
        is_active: true,
      });
    }
    setIsModalOpen(true);
  }, [branches, user?.branch_id]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/teachers/${editingId}`, formData);
        toast.success(t('common.success'));
      } else {
        await api.post('/teachers', formData);
        toast.success(t('common.success'));
      }
      handleCloseModal();
      refreshTeachers();
    } catch (error: any) {
      handleApiError(error, t);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, formData, isSubmitting, t, handleCloseModal, refreshTeachers]);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/teachers/${deletingId}`);
      toast.success(t('common.success'));
      setDeletingId(null);
      refreshTeachers();
    } catch (error: any) {
      handleApiError(error, t);
    }
  }, [deletingId, t, refreshTeachers]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={UserCheck}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all border active:scale-95 ${isFilterVisible
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm'
                }`}
              title={t('common.filter')}
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => navigate('/import?type=teachers')}
              className="h-9 px-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100 dark:border-gray-700 whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">{t('common.import')}</span>
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="h-9 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 whitespace-nowrap flex items-center justify-center gap-2 group active:scale-95"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t('teachers.addTeacher')}</span>
            </button>
          </div>
        }
      >
        <FilterBar
          isVisible={isFilterVisible}
          searchQuery={searchTerm}
          onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
        >
          <FilterSelect
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            placeholder={t('import.selectBranch')}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
          />
        </FilterBar>
      </PageHeader>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden"
        scrollable={true}
        footer={
          !loading && filteredTeachers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTeachers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(limit) => { setItemsPerPage(limit); setCurrentPage(1); }}
            />
          )
        }
      >
        {loading ? (
          <PageLoading />
        ) : filteredTeachers.length === 0 ? (
          <EmptyState
            title={searchTerm || branchFilter ? t('common.noResults') : t('teachers.noData')}
            icon={Users}
          />
        ) : (
          <TeacherTable
            teachers={filteredTeachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
            onEdit={handleOpenModal}
            onDelete={setDeletingId}
            t={t}
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('teachers.editTeacher') : t('teachers.addTeacher')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit}>
          <TeacherForm
            formData={formData}
            setFormData={setFormData}
            branches={branches}
            editingId={editingId}
            isSubmitting={isSubmitting}
            onClose={handleCloseModal}
            t={t}
          />
        </form>
      </Modal>


      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteWarning')}
        type="danger"
      />
    </div>
  );
};

export default Teachers;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../utils/errorHelper';
import { Plus, Upload, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import PageLoading from '../components/common/PageLoading';
import FilterBar from '../components/common/FilterBar';
import FilterSelect from '../components/common/FilterSelect';
import EmptyState from '../components/common/EmptyState';
import type { Student } from '../types';


import StudentTable from './Students/components/StudentTable';
import StudentForm from './Students/components/StudentForm';

import { useStudents } from '../hooks/useStudents';
import { useBranches } from '../hooks/useBranches';

const Students: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dobInputRef = React.useRef<HTMLInputElement>(null);
  const { students, loading: studentsLoading, refreshStudents } = useStudents();
  const { branches, loading: branchesLoading } = useBranches();

  const loading = studentsLoading || branchesLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

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
    is_active: true,
    parent_phone: '',
  });

  useEffect(() => {
    if (branches.length > 0 && !formData.branch_id) {
      setFormData(prev => ({ ...prev, branch_id: branches[0].id }));
    }
  }, [branches, formData.branch_id]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = student.full_name.toLowerCase().includes(query) ||
        (student.email && student.email.toLowerCase().includes(query)) ||
        (student.phone && student.phone.includes(query)) ||
        (student.parent_phone && student.parent_phone.includes(query));

      const matchesBranch = branchFilter === '' || student.branch_id === branchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [students, searchQuery, branchFilter]);

  const handleOpenModal = useCallback((student?: Student) => {
    if (student) {
      setEditingId(student.id);
      setFormData({
        full_name: student.full_name,
        email: student.email,
        phone: student.phone || '',
        date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
        branch_id: student.branch_id || (branches.length > 0 ? branches[0].id : ''),
        is_active: !!student.is_active,
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
        is_active: true,
        parent_phone: '',
      });
    }
    setIsModalOpen(true);
  }, [branches]);

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
        await api.put(`/students/${editingId}`, formData);
        toast.success(t('common.success'));
      } else {
        await api.post('/students', formData);
        toast.success(t('common.success'));
      }
      handleCloseModal();
      refreshStudents();
    } catch (error: any) {
      handleApiError(error, t);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, formData, isSubmitting, t, handleCloseModal, refreshStudents]);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/students/${deletingId}`);
      toast.success(t('common.success'));
      setDeletingId(null);
      refreshStudents();
    } catch (error: any) {
      handleApiError(error, t);
    }
  }, [deletingId, t, refreshStudents]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={Users}
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
              onClick={() => navigate('/import?type=students')}
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
              <span className="hidden sm:inline">{t('students.addStudent')}</span>
            </button>
          </div>
        }
      >
        <FilterBar
          isVisible={isFilterVisible}
          searchQuery={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
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
          !loading && filteredStudents.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredStudents.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(limit) => { setItemsPerPage(limit); setCurrentPage(1); }}
            />
          )
        }
      >
        {loading ? (
          <PageLoading />
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title={searchQuery ? t('common.noResults') : t('students.noData')}
            icon={Users}
          />
        ) : (
          <StudentTable
            students={filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
            onEdit={handleOpenModal}
            onDelete={setDeletingId}
            t={t}
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('students.editStudent') : t('students.addStudent')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit}>
          <StudentForm
            formData={formData}
            setFormData={setFormData}
            branches={branches}
            editingId={editingId}
            isSubmitting={isSubmitting}
            onClose={handleCloseModal}
            t={t}
            dobInputRef={dobInputRef}
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

export default Students;

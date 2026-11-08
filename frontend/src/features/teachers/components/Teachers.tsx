import React, { useState, useMemo, useCallback } from 'react';
import { Modal, Card, Button, FormPanelActions } from '@/components/common/UI';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import { UserCheck, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { exportToExcel, exportToPDF } from '@/utils/export';
import type { ExportColumn } from '@/utils/export';
import SkeletonTable from '@/components/common/SkeletonTable';
import FilterBar from '@/components/common/FilterBar';
import FilterSelect from '@/components/common/FilterSelect';
import EmptyState from '@/components/common/EmptyState';
import TableToolbar from '@/components/common/TableToolbar';
import { usePagination } from '@/hooks/usePagination';
import { useSelection } from '@/hooks/useSelection';
import type { Teacher, TeacherFormData } from '@/types';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';

import {
  TeacherTable,
  TeacherForm,
  useTeachers,
  useDeleteTeacher,
  useCreateTeacher,
  useUpdateTeacher,
  useDeleteBulkTeachers,
  useResetTeacherPassword,
} from '@/features/teachers';
import { useBranches } from '@/features/branches/hooks/useBranches';

const Teachers: React.FC = () => {
  const { t } = useTranslation();
  const formId = React.useId();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teachers, loading: teachersLoading } = useTeachers();
  const { branches, loading: branchesLoading } = useBranches();

  const loading = teachersLoading || branchesLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [resettingTeacher, setResettingTeacher] = useState<Teacher | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newlyCreatedPassword, setNewlyCreatedPassword] = useState<{
    email: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [editingTeacher, setEditingTeacher] = useState<TeacherFormData | null>(null);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesSearch =
        teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.phone && teacher.phone.includes(searchTerm));

      const matchesBranch = branchFilter === '' || teacher.branch_id === branchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [teachers, searchTerm, branchFilter]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedItems: paginatedTeachers,
  } = usePagination(filteredTeachers);
  const { selectedIds, handleSelectAll, handleSelectOne, clearSelection } =
    useSelection(paginatedTeachers);

  const handleOpenResetModal = useCallback((teacher: Teacher) => {
    setResettingTeacher(teacher);
    setNewlyCreatedPassword(null);
    setIsResetModalOpen(true);
  }, []);

  const handleOpenModal = useCallback(
    (teacher?: Teacher) => {
      if (teacher) {
        setEditingId(teacher.id);
        setEditingTeacher({
          full_name: teacher.full_name,
          email: teacher.email || '',
          phone: teacher.phone || '',
          specialization: teacher.specialization || '',
          branch_id:
            teacher.branch_id || user?.branch_id || (branches.length > 0 ? branches[0].id : ''),
          is_active: teacher.is_active ?? true,
        });
      } else {
        setEditingId(null);
        setEditingTeacher(null);
      }
      setIsModalOpen(true);
    },
    [branches, user?.branch_id]
  );

  const { mutate: createTeacherMutate, isPending: isCreating } = useCreateTeacher();
  const { mutate: updateTeacherMutate, isPending: isUpdating } = useUpdateTeacher();
  const { mutate: deleteTeacherMutate } = useDeleteTeacher();
  const { mutate: deleteBulkTeachersMutate } = useDeleteBulkTeachers();
  const { mutate: resetPasswordMutate, isPending: isResetting } = useResetTeacherPassword();

  const isSubmitting = isCreating || isUpdating || isResetting;

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
  }, []);

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingTeacher) return;

    resetPasswordMutate(
      { id: resettingTeacher.id, password: undefined },
      {
        onSuccess: () => {
          toast.success(t('admin.users.messages.reset_success'));
          setNewlyCreatedPassword({
            email: resettingTeacher.email || '',
          });
        },
        onError: (error: any) => handleApiError(error, t),
      }
    );
  };

  const handleSubmit = useCallback(
    (data: TeacherFormData) => {
      if (editingId) {
        updateTeacherMutate(
          { id: editingId, data },
          {
            onSuccess: () => {
              toast.success(t('common.success'));
              handleCloseModal();
            },
            onError: (error: unknown) => {
              handleApiError(error as AxiosError<ApiErrorData>, t);
            },
          }
        );
      } else {
        createTeacherMutate(data, {
          onSuccess: () => {
            toast.success(t('common.success'));
            handleCloseModal();
          },
          onError: (error: unknown) => {
            handleApiError(error as AxiosError<ApiErrorData>, t);
          },
        });
      }
    },
    [editingId, t, handleCloseModal, createTeacherMutate, updateTeacherMutate]
  );

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteTeacherMutate(deletingId, {
      onSuccess: () => {
        toast.success(t('common.success'));
        setDeletingId(null);
      },
      onError: (error: unknown) => {
        handleApiError(error as AxiosError<ApiErrorData>, t);
        setDeletingId(null);
      },
    });
  }, [deletingId, t, deleteTeacherMutate]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    deleteBulkTeachersMutate(selectedIds, {
      onSuccess: () => {
        toast.success(t('common.success'));
        clearSelection();
        setIsBulkDeleteModalOpen(false);
      },
      onError: (error: unknown) => {
        handleApiError(error as AxiosError<ApiErrorData>, t);
        setIsBulkDeleteModalOpen(false);
      },
    });
  }, [selectedIds, deleteBulkTeachersMutate, t, clearSelection]);

  const handleExportExcel = () => {
    const columns: ExportColumn<Teacher>[] = [
      { header: t('teachers.name'), accessor: 'full_name' },
      { header: t('teachers.email'), accessor: 'email' },
      { header: t('teachers.phone'), accessor: 'phone' },
      { header: t('common.status'), accessor: (t) => (t.is_active ? 'Active' : 'Inactive') },
    ];
    exportToExcel(filteredTeachers, columns, t('teachers.title'));
  };

  const handleExportPDF = () => {
    const columns: ExportColumn<Teacher>[] = [
      { header: t('teachers.name'), accessor: 'full_name' },
      { header: t('teachers.email'), accessor: 'email' },
      { header: t('teachers.phone'), accessor: 'phone' },
      { header: t('common.status'), accessor: (t) => (t.is_active ? 'Active' : 'Inactive') },
    ];
    exportToPDF(filteredTeachers, columns, t('teachers.title'));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={UserCheck}
        actions={
          <TableToolbar
            isFilterVisible={isFilterVisible}
            onToggleFilter={() => setIsFilterVisible(!isFilterVisible)}
            selectedCount={selectedIds.length}
            onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            isExportDisabled={filteredTeachers.length === 0}
            onImport={() => navigate('/import?type=teachers')}
            onAdd={() => handleOpenModal()}
            addLabel={t('common.add')}
          />
        }
      >
        <FilterBar
          isVisible={isFilterVisible}
          searchQuery={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
        >
          <FilterSelect
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            placeholder={t('import.selectBranch')}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </FilterBar>
      </PageHeader>

      <Card
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
        scrollable={true}
        footer={
          !loading &&
          filteredTeachers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTeachers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          )
        }
      >
        {loading ? (
          <div className="p-4 sm:p-6">
            <SkeletonTable columns={6} rows={5} />
          </div>
        ) : filteredTeachers.length === 0 ? (
          <EmptyState
            title={searchTerm || branchFilter ? t('common.noResults') : t('teachers.noData')}
            description={
              searchTerm || branchFilter
                ? t('common.tryDifferentSearch')
                : t('teachers.createFirstTeacher', 'Thêm giáo viên đầu tiên của bạn')
            }
            showArrow={!(searchTerm || branchFilter)}
            icon={UserCheck}
            action={
              !(searchTerm || branchFilter) ? (
                <Button
                  onClick={() => handleOpenModal()}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold"
                >
                  {t('teachers.addTeacher')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TeacherTable
            teachers={paginatedTeachers}
            onEdit={handleOpenModal}
            onDelete={(id) => setDeletingId(id)}
            onResetPassword={handleOpenResetModal}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            t={t}
          />
        )}
      </Card>

      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={t('admin.users.tooltip.reset')}
        size="md"
      >
        {newlyCreatedPassword ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
                {t('admin.users.messages.reset_success')}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                {t('admin.users.modal.password_created', { email: newlyCreatedPassword.email })}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 space-y-4 border border-gray-100 dark:border-slate-800">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Email
                </label>
                <div className="font-medium text-gray-900 dark:text-white">
                  {newlyCreatedPassword.email}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setIsResetModalOpen(false)} variant="default">
                {t('common.close')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-6 p-1">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('admin.users.modal.reset_notice_1')}
                <br />
                <strong className="font-bold">{resettingTeacher?.full_name}</strong>
              </p>
            </div>

            <p className="text-sm text-gray-500">
              Xác nhận để gửi liên kết đặt lại mật khẩu; phiên hiện tại sẽ bị thu hồi.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsResetModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="default" disabled={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('common.confirm')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('teachers.editTeacher') : t('teachers.addTeacher')}
        placement="right"
        width="clamp(480px, 44vw, 560px)"
        closeLabel={t('common.close')}
        closeBlocked={isSubmitting}
        confirmCloseMessage={t('common.discardPanelChanges')}
        footer={(requestClose) => (
          <FormPanelActions formId={formId} onCancel={requestClose} isSubmitting={isSubmitting} />
        )}
      >
        <TeacherForm
          id={formId}
          initialData={editingTeacher || undefined}
          onSubmit={handleSubmit}
          branches={branches}
          editingId={editingId}
          t={t}
        />
      </Modal>

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteWarning')}
        type="danger"
      />

      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteWarning')}
        type="danger"
      />
    </div>
  );
};

export default Teachers;

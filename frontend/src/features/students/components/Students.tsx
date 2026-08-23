import React, { useState, useMemo, useCallback } from 'react';

import { Modal, Card } from '@/components/common/UI';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import SkeletonTable from '@/components/common/SkeletonTable';
import FilterBar from '@/components/common/FilterBar';
import FilterSelect from '@/components/common/FilterSelect';
import EmptyState from '@/components/common/EmptyState';
import TableToolbar from '@/components/common/TableToolbar';
import { usePagination } from '@/hooks/usePagination';
import { useSelection } from '@/hooks/useSelection';
import type { Student, StudentFormData } from '@/types';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';

import StudentTable from '@/features/students/components/StudentTable';
import StudentForm from '@/features/students/components/StudentForm';
import { exportToExcel, exportToPDF } from '@/utils/export';
import type { ExportColumn } from '@/utils/export';

import {
  useStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useDeleteBulkStudents,
} from '@/features/students/hooks/useStudents';
import { useBranches } from '@/features/branches/hooks/useBranches';

const Students: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dobInputRef = React.useRef<HTMLInputElement>(null);
  const { students, loading: studentsLoading } = useStudents();
  const { branches, loading: branchesLoading } = useBranches();

  const loading = studentsLoading || branchesLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [editingStudent, setEditingStudent] = useState<StudentFormData | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        student.full_name.toLowerCase().includes(query) ||
        (student.email && student.email.toLowerCase().includes(query)) ||
        (student.phone && student.phone.includes(query)) ||
        (student.parent_phone && student.parent_phone.includes(query));

      const matchesBranch = branchFilter === '' || student.branch_id === branchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [students, searchQuery, branchFilter]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedItems: paginatedStudents,
  } = usePagination(filteredStudents);
  const { selectedIds, handleSelectAll, handleSelectOne, clearSelection } =
    useSelection(paginatedStudents);

  const handleOpenModal = useCallback(
    (student?: Student) => {
      if (student) {
        setEditingId(student.id);
        setEditingStudent({
          full_name: student.full_name,
          email: student.email || '',
          phone: student.phone || '',
          date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
          branch_id: student.branch_id || (branches.length > 0 ? branches[0].id : ''),
          is_active: !!student.is_active,
          parent_phone: student.parent_phone || '',
        });
      } else {
        setEditingId(null);
        setEditingStudent(null);
      }
      setIsModalOpen(true);
    },
    [branches]
  );

  const { mutate: createStudentMutate, isPending: isCreating } = useCreateStudent();
  const { mutate: updateStudentMutate, isPending: isUpdating } = useUpdateStudent();
  const { mutate: deleteStudentMutate } = useDeleteStudent();
  const { mutate: deleteBulkStudentsMutate } = useDeleteBulkStudents();

  const isSubmitting = isCreating || isUpdating;

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
  }, []);

  const handleSubmit = useCallback(
    (data: StudentFormData) => {
      if (editingId) {
        updateStudentMutate(
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
        createStudentMutate(data, {
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
    [editingId, t, handleCloseModal, createStudentMutate, updateStudentMutate]
  );

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteStudentMutate(deletingId, {
      onSuccess: () => {
        toast.success(t('common.success'));
        setDeletingId(null);
        clearSelection();
      },
      onError: (error: unknown) => {
        handleApiError(error as AxiosError<ApiErrorData>, t);
      },
    });
  }, [deletingId, t, deleteStudentMutate]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    deleteBulkStudentsMutate(selectedIds, {
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
  }, [selectedIds, deleteBulkStudentsMutate, t]);

  const handleExportExcel = () => {
    const columns: ExportColumn<Student>[] = [
      { header: t('students.name'), accessor: 'full_name' },
      { header: t('students.email'), accessor: 'email' },
      { header: t('students.phone'), accessor: 'phone' },
      { header: t('students.parentPhone'), accessor: 'parent_phone' },
      { header: t('classes.branch'), accessor: 'branch_name' },
      {
        header: t('students.dob'),
        accessor: (r) =>
          r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString('vi-VN') : '',
      },
      {
        header: t('common.status'),
        accessor: (r) => (r.is_active ? t('common.active') : t('common.inactive')),
      },
    ];
    const dateLabel = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    exportToExcel(filteredStudents, columns, `${t('export.students')}_${dateLabel}`);
  };

  const handleExportPDF = async () => {
    const columns: ExportColumn<Student>[] = [
      { header: t('students.name'), accessor: 'full_name' },
      { header: t('students.email'), accessor: 'email' },
      { header: t('students.phone'), accessor: 'phone' },
      { header: t('classes.branch'), accessor: 'branch_name' },
      {
        header: t('students.dob'),
        accessor: (r) =>
          r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString('vi-VN') : '',
      },
      {
        header: t('common.status'),
        accessor: (r) => (r.is_active ? t('common.active') : t('common.inactive')),
      },
    ];

    const dateLabel = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    await exportToPDF(
      filteredStudents,
      columns,
      `${t('export.students')}_${dateLabel}`,
      `${t('export.students')} - ${dateLabel}`
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <PageHeader
        icon={Users}
        actions={
          <TableToolbar
            isFilterVisible={isFilterVisible}
            onToggleFilter={() => setIsFilterVisible(!isFilterVisible)}
            selectedCount={selectedIds.length}
            onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            isExportDisabled={filteredStudents.length === 0}
            onImport={() => navigate('/import?type=students')}
            onAdd={() => handleOpenModal()}
            addLabel={t('students.addStudent')}
          />
        }
      >
        <FilterBar
          isVisible={isFilterVisible}
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
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
          filteredStudents.length > 0 && (
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
          )
        }
      >
        {loading ? (
          <div className="p-4 sm:p-6">
            <SkeletonTable columns={6} rows={5} />
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title={searchQuery || branchFilter ? t('common.noResults') : t('students.noData')}
            description={
              searchQuery || branchFilter
                ? t('common.tryDifferentSearch')
                : t('students.createFirstStudent', 'Th├¬m hß╗ìc vi├¬n ─æß║ºu ti├¬n cß╗ºa bß║ín')
            }
            showArrow={!(searchQuery || branchFilter)}
            icon={Users}
            action={
              !(searchQuery || branchFilter) ? (
                <button
                  onClick={() => handleOpenModal()}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/25 active:scale-95"
                >
                  {t('students.addStudent')}
                </button>
              ) : undefined
            }
          />
        ) : (
          <StudentTable
            students={paginatedStudents}
            onEdit={handleOpenModal}
            onDelete={setDeletingId}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            t={t}
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('students.editStudent') : t('students.addStudent')}
        size="xl"
      >
        <StudentForm
          initialData={editingStudent || undefined}
          onSubmit={handleSubmit}
          branches={branches}
          editingId={editingId}
          isSubmitting={isSubmitting}
          onClose={handleCloseModal}
          t={t}
          dobInputRef={dobInputRef}
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
        message={`${t('common.deleteWarning')} (${selectedIds.length} ${t('students.title')})`}
        type="danger"
      />
    </div>
  );
};

export default Students;

import React, { useState, useCallback } from 'react';
import {
  getClassSchedules,
  getClassEnrollments,
  enrollStudent,
  unenrollStudent,
  enrollBulk,
} from '@/features/classes';
import { Modal, Card, Button } from '@/components/common/UI';
import { BookOpen } from 'lucide-react';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import { useNavigate } from 'react-router-dom';
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

import type { ClassData, Enrollment, RecurringSchedule, ClassBasicFormData } from '@/types';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';

import ClassTable from '@/features/classes/components/ClassTable';
import ClassForm from '@/features/classes/components/ClassForm';
import BulkEnrollModal from '@/features/classes/components/BulkEnrollModal';

import {
  useClasses,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  useDeleteBulkClasses,
} from '@/features/classes/hooks/useClasses';

const Classes: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startDateRef = React.useRef<HTMLInputElement>(null);
  const endDateRef = React.useRef<HTMLInputElement>(null);

  const { classes, branches, teachers, rooms, allStudents, loading, refreshClasses } = useClasses();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isBulkEnrollOpen, setIsBulkEnrollOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [editingClass, setEditingClass] = useState<ClassBasicFormData | null>(null);

  const filteredClasses = React.useMemo(() => {
    return classes.filter((cls) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        cls.name.toLowerCase().includes(query) ||
        (cls.teacher_name && cls.teacher_name.toLowerCase().includes(query));

      const matchesBranch = branchFilter === '' || cls.branch_id === branchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [classes, searchQuery, branchFilter]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedItems: paginatedClasses,
  } = usePagination(filteredClasses);
  const { selectedIds, handleSelectAll, handleSelectOne, clearSelection } =
    useSelection(paginatedClasses);

  const handleOpenModal = useCallback(async (cls?: ClassData) => {
    if (cls) {
      setEditingId(cls.id);
      setEditingClass({
        name: cls.name,
        max_capacity: cls.max_capacity,
        branch_id: cls.branch_id,
        teacher_id: cls.teacher_id || '',
        start_date: cls.start_date ? cls.start_date.substring(0, 10) : '',
        end_date: cls.end_date ? cls.end_date.substring(0, 10) : '',
      });

      // Fetch additional details for editing
      try {
        const [schedulesData, enrollmentsData] = await Promise.all([
          getClassSchedules(cls.id),
          getClassEnrollments(cls.id),
        ]);
        setRecurringSchedules(schedulesData);
        setEnrollments(enrollmentsData);
      } catch (error) {
        console.error('Error fetching class details:', error);
      }
    } else {
      setEditingId(null);
      setEditingClass(null);
      setRecurringSchedules([]);
      setEnrollments([]);
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
    setRecurringSchedules([]);
    setEnrollments([]);
  }, []);

  const { mutate: createClassMutate, isPending: isCreating } = useCreateClass();
  const { mutate: updateClassMutate, isPending: isUpdating } = useUpdateClass();
  const { mutate: deleteClassMutate } = useDeleteClass();
  const { mutate: deleteBulkClassesMutate } = useDeleteBulkClasses();

  const isSubmitting = isCreating || isUpdating;

  const handleSubmit = useCallback(
    (data: ClassBasicFormData) => {
      const payload = {
        ...data,
        schedules: recurringSchedules,
        enrollments: enrollments.map((e) => e.id),
      };

      if (editingId) {
        updateClassMutate(
          { id: editingId, data: payload },
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
        createClassMutate(payload, {
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
    [
      editingId,
      recurringSchedules,
      enrollments,
      t,
      handleCloseModal,
      createClassMutate,
      updateClassMutate,
    ]
  );

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteClassMutate(deletingId, {
      onSuccess: () => {
        toast.success(t('common.success'));
        setDeletingId(null);
      },
      onError: (error: unknown) => {
        handleApiError(error as AxiosError<ApiErrorData>, t);
      },
    });
  }, [deletingId, t, deleteClassMutate]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    deleteBulkClassesMutate(selectedIds, {
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
  }, [selectedIds, deleteBulkClassesMutate, t, clearSelection]);

  const handleEnrollStudent = useCallback(async () => {
    if (!selectedStudentId) return;

    if (editingId) {
      try {
        await enrollStudent(editingId, selectedStudentId);
        toast.success(t('common.success'));
        // Refresh local enrollments
        const data = await getClassEnrollments(editingId);
        setEnrollments(data);
        setSelectedStudentId('');
        refreshClasses();
      } catch (error: unknown) {
        handleApiError(error as AxiosError<ApiErrorData>, t);
      }
    } else {
      const student = allStudents.find((s) => String(s.id) === String(selectedStudentId));
      if (student && !enrollments.find((e) => String(e.id) === String(student.id))) {
        setEnrollments([
          ...enrollments,
          {
            id: student.id,
            full_name: student.full_name,
            email: student.email,
            enrolled_at: new Date().toISOString(),
          },
        ]);
        setSelectedStudentId('');
      }
    }
  }, [editingId, selectedStudentId, enrollments, allStudents, t, refreshClasses]);

  const handleBulkEnroll = useCallback(
    async (studentIds: string[]) => {
      if (studentIds.length === 0) return;

      if (editingId) {
        try {
          await enrollBulk(editingId, studentIds);
          toast.success(t('common.success'));
          const data = await getClassEnrollments(editingId);
          setEnrollments(data);
          setIsBulkEnrollOpen(false);
          refreshClasses();
        } catch (error: unknown) {
          handleApiError(error as AxiosError<ApiErrorData>, t);
        }
      } else {
        const newEnrollments = [...enrollments];
        studentIds.forEach((id) => {
          const student = allStudents.find((s) => s.id === id);
          if (student && !newEnrollments.find((e) => e.id === student.id)) {
            newEnrollments.push({
              id: student.id,
              full_name: student.full_name,
              email: student.email,
              enrolled_at: new Date().toISOString(),
            });
          }
        });
        setEnrollments(newEnrollments);
        setIsBulkEnrollOpen(false);
      }
    },
    [editingId, enrollments, allStudents, t, refreshClasses]
  );

  const handleUnenrollStudent = useCallback(
    async (studentId: string) => {
      if (editingId) {
        try {
          await unenrollStudent(editingId, studentId);
          toast.success(t('common.success'));
          setEnrollments(enrollments.filter((e) => e.id !== studentId));
          refreshClasses();
        } catch (error: unknown) {
          handleApiError(error as AxiosError<ApiErrorData>, t);
        }
      } else {
        setEnrollments(enrollments.filter((e) => e.id !== studentId));
      }
    },
    [editingId, enrollments, t, refreshClasses]
  );
  const handleExportExcel = () => {
    const columns: ExportColumn<any>[] = [
      { header: t('classes.name'), accessor: 'name' },
      { header: t('classes.teacher'), accessor: 'teacher_name' },
      { header: t('classes.branch'), accessor: 'branch_name' },
      { header: t('common.status'), accessor: (c: any) => (c.is_active ? 'Active' : 'Inactive') },
    ];
    exportToExcel(filteredClasses, columns, t('classes.title'));
  };

  const handleExportPDF = () => {
    const columns: ExportColumn<any>[] = [
      { header: t('classes.name'), accessor: 'name' },
      { header: t('classes.teacher'), accessor: 'teacher_name' },
      { header: t('classes.branch'), accessor: 'branch_name' },
      { header: t('common.status'), accessor: (c: any) => (c.is_active ? 'Active' : 'Inactive') },
    ];
    exportToPDF(filteredClasses, columns, t('classes.title'));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={BookOpen}
        actions={
          <TableToolbar
            isFilterVisible={isFilterVisible}
            onToggleFilter={() => setIsFilterVisible(!isFilterVisible)}
            selectedCount={selectedIds.length}
            onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            isExportDisabled={filteredClasses.length === 0}
            onImport={() => navigate('/import?type=classes')}
            onAdd={() => handleOpenModal()}
            addLabel={t('common.add')}
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
          filteredClasses.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredClasses.length}
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
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-4 sm:p-6">
              <SkeletonTable columns={6} rows={5} />
            </div>
          ) : filteredClasses.length === 0 ? (
            <EmptyState
              title={searchQuery || branchFilter ? t('common.noResults') : t('classes.noClasses')}
              description={
                searchQuery || branchFilter
                  ? t('common.tryDifferentSearch')
                  : t('classes.createFirstClass')
              }
              showArrow={!(searchQuery || branchFilter)}
              icon={BookOpen}
              action={
                !(searchQuery || branchFilter) ? (
                  <Button
                    onClick={() => handleOpenModal()}
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold"
                  >
                    {t('classes.addClass')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ClassTable
              classes={paginatedClasses}
              onEdit={handleOpenModal}
              onDelete={(id) => setDeletingId(id)}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              t={t}
            />
          )}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('classes.editClass') : t('classes.addClass')}
        size="4xl"
      >
        <ClassForm
          initialData={editingClass || undefined}
          onSubmit={handleSubmit}
          branches={branches}
          teachers={teachers}
          rooms={rooms}
          allStudents={allStudents}
          recurringSchedules={recurringSchedules}
          setRecurringSchedules={setRecurringSchedules}
          enrollments={enrollments}
          selectedStudentId={selectedStudentId}
          setSelectedStudentId={setSelectedStudentId}
          onEnrollStudent={handleEnrollStudent}
          onUnenrollStudent={handleUnenrollStudent}
          onOpenBulkEnroll={() => setIsBulkEnrollOpen(true)}
          onClose={handleCloseModal}
          isSubmitting={isSubmitting}
          t={t}
          startDateRef={startDateRef}
          endDateRef={endDateRef}
        />
      </Modal>

      <BulkEnrollModal
        isOpen={isBulkEnrollOpen}
        onClose={() => setIsBulkEnrollOpen(false)}
        allStudents={allStudents}
        enrollments={enrollments}
        onBulkEnroll={handleBulkEnroll}
        t={t}
      />

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

export default Classes;

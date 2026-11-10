import React, { useState, useCallback } from 'react';
import { getClassSchedules, getClassEnrollments } from '@/features/classes';
import { Modal, Card, Button, FormPanelActions } from '@/components/common/UI';
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
  const formId = React.useId();
  const navigate = useNavigate();
  const startDateRef = React.useRef<HTMLInputElement>(null);
  const endDateRef = React.useRef<HTMLInputElement>(null);
  const [originalSchedules, setOriginalSchedules] = useState('[]');

  const { classes, branches, teachers, rooms, allStudents, loading } = useClasses();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [originalEnrollmentIds, setOriginalEnrollmentIds] = useState<Set<string>>(() => new Set());
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isBulkEnrollOpen, setIsBulkEnrollOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [editingClass, setEditingClass] = useState<ClassBasicFormData | null>(null);
  const [highlightedClassId, setHighlightedClassId] = useState<string | null>(null);

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

  const handleOpenModal = useCallback(
    async (cls?: ClassData) => {
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
          setOriginalSchedules(JSON.stringify(schedulesData));
          setRecurringSchedules(schedulesData);
          setEnrollments(enrollmentsData);
          setOriginalEnrollmentIds(new Set(enrollmentsData.map(({ id }) => id)));
        } catch (error) {
          handleApiError(error as AxiosError<ApiErrorData>, t);
          return;
        }
      } else {
        setEditingId(null);
        setEditingClass(null);
        setOriginalSchedules('[]');
        setRecurringSchedules([]);
        setEnrollments([]);
        setOriginalEnrollmentIds(new Set());
      }
      setSelectedStudentId('');
      setIsModalOpen(true);
    },
    [t]
  );

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
  const enrollmentsChanged =
    enrollments.length !== originalEnrollmentIds.size ||
    enrollments.some(({ id }) => !originalEnrollmentIds.has(id));

  const handleSubmit = useCallback(
    (data: ClassBasicFormData) => {
      const scheduleChanged = JSON.stringify(recurringSchedules) !== originalSchedules;
      const scheduleDatesOrTeacherChanged =
        editingClass &&
        (data.teacher_id !== editingClass.teacher_id ||
          data.start_date !== editingClass.start_date ||
          data.end_date !== editingClass.end_date);
      const sendSchedule =
        scheduleChanged || (recurringSchedules.length > 0 && scheduleDatesOrTeacherChanged);
      const payload = {
        ...data,
        teacher_id: data.teacher_id || null,
        recurring_schedules: sendSchedule
          ? recurringSchedules.map((schedule) => ({
              ...schedule,
              day_of_week: String(schedule.day_of_week),
              room_id: schedule.room_id || null,
            }))
          : undefined,
        enrollments: enrollmentsChanged ? enrollments.map(({ id }) => id) : undefined,
      };

      if (editingId) {
        updateClassMutate(
          { id: editingId, data: payload },
          {
            onSuccess: () => {
              setHighlightedClassId(editingId);
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
          onSuccess: ({ data: savedClass }) => {
            if (typeof savedClass?.id === 'string') setHighlightedClassId(savedClass.id);
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
      editingClass,
      recurringSchedules,
      originalSchedules,
      enrollments,
      enrollmentsChanged,
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

  const addDraftEnrollments = useCallback(
    (studentIds: string[]) => {
      const selectedIds = new Set(studentIds);
      const enrolledAt = new Date().toISOString();
      setEnrollments((current) => {
        const enrolledIds = new Set(current.map(({ id }) => id));
        const additions = allStudents
          .filter(({ id }) => selectedIds.has(id) && !enrolledIds.has(id))
          .map(({ id, full_name, email }) => ({ id, full_name, email, enrolled_at: enrolledAt }));
        return [...current, ...additions];
      });
    },
    [allStudents]
  );

  const handleEnrollStudent = () => {
    if (!selectedStudentId) return;
    addDraftEnrollments([selectedStudentId]);
    setSelectedStudentId('');
  };

  const handleBulkEnroll = (studentIds: string[]) => {
    if (studentIds.length === 0) return;
    addDraftEnrollments(studentIds);
    setIsBulkEnrollOpen(false);
  };

  const handleUnenrollStudent = (studentId: string) => {
    setEnrollments((current) => current.filter(({ id }) => id !== studentId));
  };

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
            label={t('classes.branch')}
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
              highlightedClassId={highlightedClassId}
              onHighlightEnd={() => setHighlightedClassId(null)}
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
        placement="right"
        width="clamp(600px, 58vw, 860px)"
        bodyClassName="hide-scrollbar"
        closeLabel={t('common.close')}
        closeBlocked={isSubmitting}
        confirmCloseMessage={t('common.discardPanelChanges')}
        hasUnsavedChanges={
          JSON.stringify(recurringSchedules) !== originalSchedules || enrollmentsChanged
        }
        footer={(requestClose) => (
          <FormPanelActions formId={formId} onCancel={requestClose} isSubmitting={isSubmitting} />
        )}
      >
        <ClassForm
          id={formId}
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

import React, { useState, useCallback } from 'react';
import {
  getClassSchedules,
  getClassEnrollments,
  enrollStudent,
  unenrollStudent,
  enrollBulk,
} from '@/services/classesService';
import { Modal, Card } from '@/components/common/UI';
import { BookOpen, Plus, Upload, Search } from 'lucide-react';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import SkeletonTable from '@/components/common/SkeletonTable';
import FilterBar from '@/components/common/FilterBar';
import FilterSelect from '@/components/common/FilterSelect';
import EmptyState from '@/components/common/EmptyState';

import type { ClassData, Enrollment, RecurringSchedule, ClassBasicFormData } from '@/types';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';

import ClassTable from '@/features/classes/components/ClassTable';
import ClassForm from '@/features/classes/components/ClassForm';
import BulkEnrollModal from '@/features/classes/components/BulkEnrollModal';

import { useClasses, useCreateClass, useUpdateClass, useDeleteClass } from '@/features/classes/hooks/useClasses';

const Classes: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startDateRef = React.useRef<HTMLInputElement>(null);
  const endDateRef = React.useRef<HTMLInputElement>(null);

  const { classes, branches, teachers, rooms, allStudents, loading, refreshClasses } = useClasses();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isBulkEnrollOpen, setIsBulkEnrollOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);
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
    },
    [branches]
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
    [editingId, recurringSchedules, enrollments, t, handleCloseModal, createClassMutate, updateClassMutate]
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={BookOpen}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all border active:scale-95 ${
                isFilterVisible
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm'
              }`}
              title={t('common.filter')}
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => navigate('/import?type=classes')}
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
              <span className="hidden sm:inline">{t('classes.addClass')}</span>
            </button>
          </div>
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
            description={searchQuery || branchFilter ? t('common.tryDifferentSearch') : t('classes.createFirstClass')}
            showArrow={!(searchQuery || branchFilter)}
            illustration={
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-48 mx-auto">
                <rect x="30" y="50" width="140" height="100" rx="12" className="fill-blue-50 dark:fill-blue-900/20 stroke-blue-200 dark:stroke-blue-800" strokeWidth="4" />
                <path d="M70 90h60M70 110h40" className="stroke-blue-300 dark:stroke-blue-700" strokeWidth="4" strokeLinecap="round" />
                <circle cx="130" cy="120" r="12" className="fill-blue-400 dark:fill-blue-600" />
                <path d="M125 120l3 3 6-6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            action={
              !(searchQuery || branchFilter) ? (
                <button
                  onClick={() => handleOpenModal()}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/25 active:scale-95"
                >
                  {t('classes.addClass')}
                </button>
              ) : undefined
            }
          />
        ) : (
          <ClassTable
            classes={filteredClasses.slice(
              (currentPage - 1) * itemsPerPage,
              currentPage * itemsPerPage
            )}
            onEdit={handleOpenModal}
            onDelete={setDeletingId}
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
    </div>
  );
};

export default Classes;

import React, { useState, useCallback } from 'react';
import {
  createClass,
  updateClass,
  deleteClass,
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
import PageLoading from '@/components/common/PageLoading';
import FilterBar from '@/components/common/FilterBar';
import FilterSelect from '@/components/common/FilterSelect';
import EmptyState from '@/components/common/EmptyState';

import type { ClassData, Enrollment, RecurringSchedule } from '@/types';

import ClassTable from '@/features/classes/components/ClassTable';
import ClassForm from '@/features/classes/components/ClassForm';
import BulkEnrollModal from '@/features/classes/components/BulkEnrollModal';

import { useClasses } from '@/features/classes/hooks/useClasses';

const Classes: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startDateRef = React.useRef<HTMLInputElement>(null);
  const endDateRef = React.useRef<HTMLInputElement>(null);

  const { classes, branches, teachers, rooms, allStudents, loading, refreshClasses } = useClasses();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const [editingClass, setEditingClass] = useState<any>(null);

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

  const handleSubmit = useCallback(
    async (data: any) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const payload = {
          ...data,
          schedules: recurringSchedules,
          enrollments: enrollments.map((e) => e.id),
        };

        if (editingId) {
          await updateClass(editingId, payload);
          toast.success(t('common.success'));
        } else {
          await createClass(payload);
          toast.success(t('common.success'));
        }
        handleCloseModal();
        refreshClasses();
      } catch (error: any) {
        handleApiError(error, t);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingId, isSubmitting, recurringSchedules, enrollments, t, handleCloseModal, refreshClasses]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteClass(deletingId);
      toast.success(t('common.success'));
      setDeletingId(null);
      refreshClasses();
    } catch (error: any) {
      handleApiError(error, t);
    }
  }, [deletingId, t, refreshClasses]);

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
      } catch (error: any) {
        handleApiError(error, t);
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
        } catch (error: any) {
          handleApiError(error, t);
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
        } catch (error: any) {
          handleApiError(error, t);
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
        {loading ? (
          <PageLoading />
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            title={searchQuery ? t('common.noResults') : t('classes.noData')}
            icon={BookOpen}
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
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('classes.editClass') : t('classes.addClass')}
        size="4xl"
      >
        <ClassForm
          initialData={editingClass}
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

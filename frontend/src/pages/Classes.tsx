import React, { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { BookOpen, Users, Calendar, Clock, X, Plus, Upload, Search } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../utils/errorHelper';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import PageLoading from '../components/common/PageLoading';
import FilterBar from '../components/common/FilterBar';
import FilterSelect from '../components/common/FilterSelect';
import EmptyState from '../components/common/EmptyState';

interface ClassItem {
  id: string;
  name: string;
  max_capacity: number;
  branch_id: string;
  branch_name?: string;
  teacher_id: string;
  teacher_name?: string;
  subject_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  full_name: string;
}

interface Room {
  id: string;
  name: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface Enrollment {
  id: string;
  full_name: string;
  email: string;
  enrolled_at: string;
}

interface RecurringSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id: string;
  notes?: string;
}

const Classes: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startDateRef = React.useRef<HTMLInputElement>(null);
  const endDateRef = React.useRef<HTMLInputElement>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isBulkEnrollOpen, setIsBulkEnrollOpen] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [bulkSearch, setBulkSearch] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    max_capacity: 30,
    branch_id: '',
    teacher_id: '',
    subject_id: '',
    start_date: '',
    end_date: '',
    status: 'active',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, branchesRes, teachersRes, roomsRes, studentsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/branches'),
        api.get('/teachers'),
        api.get('/rooms'),
        api.get('/students')
      ]);
      setClasses(classesRes.data);
      setBranches(branchesRes.data);
      setTeachers(teachersRes.data);
      setRooms(roomsRes.data);
      setAllStudents(studentsRes.data);

      if (branchesRes.data.length > 0 && !formData.branch_id) {
        setFormData(prev => ({ ...prev, branch_id: branchesRes.data[0].id }));
      }
    } catch (error) {
      toast.error(t('common.error'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredClasses = classes.filter(cls => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = cls.name.toLowerCase().includes(query) ||
      (cls.teacher_name && cls.teacher_name.toLowerCase().includes(query));

    const matchesBranch = branchFilter === '' || cls.branch_id === branchFilter;

    return matchesSearch && matchesBranch;
  });

  const handleOpenModal = async (cls?: ClassItem) => {
    if (cls) {
      setEditingId(cls.id);
      setFormData({
        name: cls.name,
        max_capacity: cls.max_capacity || 30,
        branch_id: cls.branch_id || (branches.length > 0 ? branches[0].id : ''),
        teacher_id: cls.teacher_id || '',
        subject_id: cls.subject_id || '',
        start_date: cls.start_date ? cls.start_date.split('T')[0] : '',
        end_date: cls.end_date ? cls.end_date.split('T')[0] : '',
        status: cls.status || 'active',
      });
      try {
        const [recurringRes, enrollmentRes] = await Promise.all([
          api.get(`/classes/${cls.id}/recurring`),
          api.get(`/classes/${cls.id}/students`)
        ]);
        setRecurringSchedules(recurringRes.data);
        setEnrollments(enrollmentRes.data);
      } catch (error) {
        console.error('Failed to fetch class details:', error);
        setRecurringSchedules([]);
        setEnrollments([]);
      }
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        max_capacity: 30,
        branch_id: branches.length > 0 ? branches[0].id : '',
        teacher_id: '',
        subject_id: '',
        start_date: '',
        end_date: '',
        status: 'active',
      });
      setRecurringSchedules([]);
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
      const dataToSubmit = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        teacher_id: formData.teacher_id || null,
      };

      if (editingId) {
        await api.put(`/classes/${editingId}`, { ...dataToSubmit, recurring_schedules: recurringSchedules });
        toast.success(t('common.success'));
      } else {
        await api.post('/classes', {
          ...dataToSubmit,
          recurring_schedules: recurringSchedules,
          student_ids: enrollments.map(e => e.id)
        });
        toast.success(t('common.success'));
      }
      handleCloseModal();
      fetchData();
    } catch (error: any) {
      handleApiError(error, t);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/classes/${deletingId}`);
      toast.success(t('common.success'));
      setDeletingId(null);
      fetchData();
    } catch (error: any) {
      toast.error(t('common.error'));
    }
  };

  const handleEnrollStudent = async () => {
    if (!selectedStudentId) return;

    if (editingId) {
      try {
        await api.post(`/classes/${editingId}/students`, { student_id: selectedStudentId });
        const res = await api.get(`/classes/${editingId}/students`);
        setEnrollments(res.data);
        setSelectedStudentId('');
        toast.success(t('common.success'));
      } catch (error: any) {
        handleApiError(error, t);
      }
    } else {
      // Local enrollment for new class
      const student = allStudents.find(s => s.id === selectedStudentId);
      if (student && !enrollments.find(e => e.id === student.id)) {
        setEnrollments([...enrollments, { ...student, enrolled_at: new Date().toISOString() }]);
        setSelectedStudentId('');
      }
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedBulkIds.length === 0) return;

    if (editingId) {
      try {
        await api.post(`/classes/${editingId}/students`, { student_ids: selectedBulkIds });
        const res = await api.get(`/classes/${editingId}/students`);
        setEnrollments(res.data);
        setSelectedBulkIds([]);
        setIsBulkEnrollOpen(false);
        toast.success(t('common.success'));
      } catch (error: any) {
        handleApiError(error, t);
      }
    } else {
      // Local bulk enrollment for new class
      const newStudents = allStudents.filter(s => selectedBulkIds.includes(s.id) && !enrollments.find(e => e.id === s.id));
      setEnrollments([...enrollments, ...newStudents.map(s => ({ ...s, enrolled_at: new Date().toISOString() }))]);
      setSelectedBulkIds([]);
      setIsBulkEnrollOpen(false);
    }
  };

  const handleUnenrollStudent = async (studentId: string) => {
    if (editingId) {
      try {
        await api.delete(`/classes/${editingId}/students/${studentId}`);
        setEnrollments(enrollments.filter(e => e.id !== studentId));
        toast.success(t('common.success'));
      } catch (error) {
        handleApiError(error, t);
      }
    } else {
      // Local unenrollment for new class
      setEnrollments(enrollments.filter(e => e.id !== studentId));
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={BookOpen}
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
          !loading && filteredClasses.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredClasses.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(limit) => { setItemsPerPage(limit); setCurrentPage(1); }}
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
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead className="bg-gray-50/50 dark:bg-gray-900/20 sticky top-0 z-10 border-b border-gray-100 dark:border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('classes.name')}</th>
                  <th className="hidden lg:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('classes.branch')}</th>
                  <th className="hidden md:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('classes.teacher')}</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('classes.capacity')}</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.status')}</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filteredClasses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xs shrink-0">
                          {cls.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">{cls.name}</div>
                          <div className="text-[10px] text-gray-500 truncate">{cls.teacher_name || t('classes.unassigned')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-400">
                      {cls.branch_name || '---'}
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                      {cls.teacher_name || t('classes.unassigned')}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                      {cls.max_capacity} {t('classes.students')}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4">
                      <span className={`px-2 py-0.5 inline-flex text-[9px] font-black rounded-full uppercase tracking-tighter ${cls.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {cls.status === 'active' ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(cls)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all active:scale-90">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeletingId(cls.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('classes.editClass') : t('classes.addClass')}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('classes.name')} *</label>
                <input
                  required
                  type="text"
                  placeholder={t('classes.namePlaceholder')}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('classes.branch')} *</label>
                  <select
                    required
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white"
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  >
                    <option value="" disabled>---</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('classes.capacity')}</label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('classes.teacher')}</label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white"
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                >
                  <option value="">-- {t('classes.unassigned')} --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('classes.startDate')}</label>
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => {
                      const input = startDateRef.current as any;
                      if (input) {
                        if ('showPicker' in input) input.showPicker();
                        else input.click();
                      }
                    }}
                  >
                    <input
                      ref={startDateRef}
                      type="date"
                      className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white cursor-pointer"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('classes.endDate')}</label>
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => {
                      const input = endDateRef.current as any;
                      if (input) {
                        if ('showPicker' in input) input.showPicker();
                        else input.click();
                      }
                    }}
                  >
                    <input
                      ref={endDateRef}
                      type="date"
                      className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white cursor-pointer"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recurring Schedule */}
            <div className="flex flex-col h-full min-h-[50px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={14} />
                  {t('classes.recurringSchedule')}
                </label>
                <button
                  type="button"
                  onClick={() => setRecurringSchedules([...recurringSchedules, { day_of_week: 1, start_time: '08:00', end_time: '10:00', room_id: '' }])}
                  className="text-[10px] bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Plus size={12} />
                  {t('common.add')}
                </button>
              </div>

              <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3 overflow-y-auto custom-scrollbar space-y-2">
                {recurringSchedules.map((schedule, index) => (
                  <div key={index} className="relative bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setRecurringSchedules(recurringSchedules.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-gray-700 text-red-500 rounded-full shadow-md border border-gray-100 dark:border-gray-600 flex items-center justify-center hover:bg-red-50"
                    >
                      <X size={12} />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="text-xs font-bold border-none bg-gray-50 dark:bg-gray-900 dark:text-white rounded-lg py-2 px-3"
                        value={schedule.day_of_week}
                        onChange={(e) => {
                          const newSchedules = [...recurringSchedules];
                          newSchedules[index].day_of_week = parseInt(e.target.value);
                          setRecurringSchedules(newSchedules);
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 0].map(day => (
                          <option key={day} value={day}>{day === 0 ? t('common.days.sunday') : `${t('common.days.weekday')} ${day + 1}`}</option>
                        ))}
                      </select>
                      <select
                        className="text-xs font-bold border-none bg-gray-50 dark:bg-gray-900 dark:text-white rounded-lg py-2 px-3"
                        value={schedule.room_id}
                        onChange={(e) => {
                          const newSchedules = [...recurringSchedules];
                          newSchedules[index].room_id = e.target.value;
                          setRecurringSchedules(newSchedules);
                        }}
                      >
                        <option value="">{t('classes.selectRoom')}</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <input
                        type="time"
                        className="text-xs font-bold border-none bg-gray-50 dark:bg-gray-900 dark:text-white rounded-lg py-2 px-3"
                        value={schedule.start_time}
                        onChange={(e) => {
                          const newSchedules = [...recurringSchedules];
                          newSchedules[index].start_time = e.target.value;
                          setRecurringSchedules(newSchedules);
                        }}
                      />
                      <input
                        type="time"
                        className="text-xs font-bold border-none bg-gray-50 dark:bg-gray-900 dark:text-white rounded-lg py-2 px-3"
                        value={schedule.end_time}
                        onChange={(e) => {
                          const newSchedules = [...recurringSchedules];
                          newSchedules[index].end_time = e.target.value;
                          setRecurringSchedules(newSchedules);
                        }}
                      />
                      <input
                        type="text"
                        placeholder={t('classes.scheduleNote')}
                        className="col-span-2 text-xs font-bold border-none bg-gray-50 dark:bg-gray-900 dark:text-white rounded-lg py-2 px-3 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        value={schedule.notes || ''}
                        onChange={(e) => {
                          const newSchedules = [...recurringSchedules];
                          newSchedules[index].notes = e.target.value;
                          setRecurringSchedules(newSchedules);
                        }}
                      />
                    </div>
                  </div>
                ))}
                {recurringSchedules.length === 0 && (
                  <div className="h-full flex items-center justify-center text-center p-8">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">{t('classes.noRecurringSchedule')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enrollments */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} />
                {t('students.title')} ({enrollments.length})
              </label>
              <button
                type="button"
                onClick={() => setIsBulkEnrollOpen(true)}
                className="text-[10px] bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-all font-black uppercase tracking-widest flex items-center gap-2"
              >
                <Plus size={14} />
                {t('common.bulkAdd')}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <select
                  className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-[11px] font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_10px_center] bg-no-repeat"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">{t('students.selectStudent')}</option>
                  {allStudents
                    .filter(s => !enrollments.find(e => e.id === s.id))
                    .map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)
                  }
                </select>
              </div>
              <button
                type="button"
                onClick={handleEnrollStudent}
                disabled={!selectedStudentId}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95"
              >
                {t('common.add')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
              {enrollments.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 group hover:border-primary/30 transition-all">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{s.full_name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{s.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnenrollStudent(s.id)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-2.5 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBulkEnrollOpen}
        onClose={() => setIsBulkEnrollOpen(false)}
        title={t('common.bulkAdd')}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder={t('common.search')}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/20 outline-none"
              value={bulkSearch}
              onChange={(e) => setBulkSearch(e.target.value)}
            />
          </div>
          <div className="max-h-80 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl divide-y dark:divide-gray-700">
            {allStudents
              .filter(s => !enrollments.find(e => e.id === s.id))
              .filter(s => s.full_name.toLowerCase().includes(bulkSearch.toLowerCase()) || s.email.toLowerCase().includes(bulkSearch.toLowerCase()))
              .map(student => (
                <label key={student.id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    checked={selectedBulkIds.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBulkIds([...selectedBulkIds, student.id]);
                      else setSelectedBulkIds(selectedBulkIds.filter(id => id !== student.id));
                    }}
                  />
                  <div className="ml-3">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{student.full_name}</p>
                    <p className="text-[10px] text-gray-500">{student.email}</p>
                  </div>
                </label>
              ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsBulkEnrollOpen(false)}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleBulkEnroll}
              disabled={selectedBulkIds.length === 0}
              className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              {t('common.add')} ({selectedBulkIds.length})
            </button>
          </div>
        </div>
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

export default Classes;

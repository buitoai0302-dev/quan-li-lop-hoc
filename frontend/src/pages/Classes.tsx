import React, { useState, useEffect } from 'react';
import NoResults from '../components/NoResults';
import api from '../api';
import Modal from '../components/Modal';
import { BookOpen, Users, Calendar, Clock, X, Plus, Upload, Search } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../utils/errorHelper';
import { useNavigate } from 'react-router-dom';

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
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isBulkEnrollOpen, setIsBulkEnrollOpen] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

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
      // Validate dates
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
        await api.post('/classes', { ...dataToSubmit, recurring_schedules: recurringSchedules });
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
      fetchData();
    } catch (error: any) {
      toast.error(t('common.error'));
    }
  };

  const handleEnrollStudent = async () => {
    if (!editingId || !selectedStudentId) return;
    try {
      await api.post(`/classes/${editingId}/students`, { student_id: selectedStudentId });
      const res = await api.get(`/classes/${editingId}/students`);
      setEnrollments(res.data);
      setSelectedStudentId('');
      toast.success(t('common.success'));
    } catch (error: any) {
      handleApiError(error, t);
    }
  };

  const handleBulkEnroll = async () => {
    if (!editingId || selectedBulkIds.length === 0) return;
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
  };

  const handleUnenrollStudent = async (studentId: string) => {
    if (!editingId) return;
    try {
      await api.delete(`/classes/${editingId}/students/${studentId}`);
      setEnrollments(enrollments.filter(e => e.id !== studentId));
      toast.success(t('common.success'));
    } catch (error) {
      handleApiError(error, t);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-colors">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:max-w-xl order-2 sm:order-1">
            <div className="relative flex-1 sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
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
              className="w-full sm:w-auto border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-800 transition-all shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">{t('import.selectBranch')}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 order-1 sm:order-2">
            <button
              onClick={() => navigate('/import?type=classes')}
              className="flex-1 sm:flex-none h-9 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-200 dark:border-gray-600 whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              title={t('common.import')}
            >
              <Upload size={16} />
              <span className="sm:inline">{t('common.import')}</span>
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-none h-9 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 whitespace-nowrap flex items-center justify-center gap-2 group active:scale-95"
              title={t('classes.addClass')}
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="sm:inline">{t('classes.addClass')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto -mx-3 sm:-mx-6 px-3 sm:px-6 relative">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <React.Fragment>
            <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-gray-900/90 backdrop-blur-md">
                  <th className="w-auto px-2 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('classes.name')}</th>
                  <th className="hidden lg:table-cell w-[20%] px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('classes.branch')}</th>
                  <th className="hidden md:table-cell w-[20%] px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('classes.teacher')}</th>
                  <th className="hidden sm:table-cell w-28 px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('classes.capacity')}</th>
                  <th className="hidden sm:table-cell w-28 px-2 sm:px-6 py-3 text-left text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('common.status')}</th>
                  <th className="w-20 sm:w-28 px-2 sm:px-6 py-3 text-right text-[10px] sm:text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClasses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-2 sm:px-6 py-3">
                      <div className="flex items-center min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="h-9 w-9 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold text-xs">
                            C
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${cls.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">{cls.name}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 sm:hidden truncate">
                            {cls.teacher_name || t('classes.unassigned')} • {cls.max_capacity} HS
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-3 text-sm text-gray-900 dark:text-gray-300 truncate">
                      {cls.branch_name || t('rooms.unknown')}
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 text-sm text-gray-900 dark:text-gray-300 truncate">
                      {cls.teacher_name || t('classes.unassigned')}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {cls.max_capacity} {t('classes.students')}
                    </td>
                    <td className="hidden sm:table-cell px-2 sm:px-6 py-3 whitespace-nowrap">
                      {cls.status === 'active' ? (
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
                        <button onClick={() => handleOpenModal(cls)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeletingId(cls.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClasses.length === 0 && (
                  <NoResults 
                    title={searchQuery ? t('common.noResults') : t('classes.noData')}
                    colSpan={6} 
                  />
                )}
              </tbody>
            </table>
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
          </React.Fragment>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('classes.editClass') : t('classes.addClass')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Main Info Section */}
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-black text-indigo-600/50 dark:text-indigo-400/50 uppercase tracking-widest">{t('common.info')}</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('classes.name')} *</label>
              <input
                required
                type="text"
                placeholder={t('classes.namePlaceholder')}
                className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('classes.branch')} *</label>
                <div className="relative">
                  <select
                    required
                    className="block w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all text-sm font-medium dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  >
                    <option value="" disabled className="dark:bg-gray-900">---</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id} className="dark:bg-gray-900">{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('classes.capacity')}</label>
                <input
                  type="number"
                  min="1"
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* People Section */}
          <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100/50 dark:border-amber-500/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-black text-amber-600/50 dark:text-amber-400/50 uppercase tracking-widest">{t('classes.personnel')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('classes.teacher')}</label>
                <select
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all text-sm font-medium dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                >
                  <option value="">-- {t('classes.unassigned')} --</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('common.status')}</label>
                <select
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all text-sm font-medium dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">{t('common.active')}</option>
                  <option value="cancelled">{t('common.inactive')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-rose-600 dark:text-rose-400" />
              <span className="text-[10px] font-black text-rose-600/50 dark:text-rose-400/50 uppercase tracking-widest">{t('classes.timeline')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('classes.startDate')}</label>
                <input
                  type="date"
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('classes.endDate')}</label>
                <input
                  type="date"
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Recurring Schedule */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3 px-1">
              <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} />
                {t('classes.recurringSchedule')}
              </label>
              <button
                type="button"
                onClick={() => setRecurringSchedules([...recurringSchedules, { day_of_week: 1, start_time: '08:00', end_time: '10:00', room_id: '', notes: '' }])}
                className="text-[10px] bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all font-black uppercase tracking-wider"
              >
                + {t('common.add')}
              </button>
            </div>

            <div className="space-y-3">
              {recurringSchedules.map((schedule, index) => (
                <div key={index} className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm transition-all hover:border-primary/20 group">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">{t('common.day')}</label>
                      <select
                        className="w-full text-xs border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white py-2 shadow-sm focus:ring-primary focus:border-primary outline-none transition-all"
                        value={schedule.day_of_week}
                        onChange={(e) => {
                          const newSchedules = [...recurringSchedules];
                          newSchedules[index].day_of_week = parseInt(e.target.value);
                          setRecurringSchedules(newSchedules);
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 0].map(day => (
                          <option key={day} value={day}>
                            {day === 0 ? t('common.days.sunday') : `${t('common.days.weekday')} ${day + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-2">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">{t('common.start')}</label>
                        <input
                          type="time"
                          className="w-full text-xs border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white py-2 shadow-sm focus:ring-primary focus:border-primary outline-none transition-all"
                          value={schedule.start_time}
                          onChange={(e) => {
                            const newSchedules = [...recurringSchedules];
                            newSchedules[index].start_time = e.target.value;
                            setRecurringSchedules(newSchedules);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">{t('common.end')}</label>
                        <input
                          type="time"
                          className="w-full text-xs border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white py-2 shadow-sm focus:ring-primary focus:border-primary outline-none transition-all"
                          value={schedule.end_time}
                          onChange={(e) => {
                            const newSchedules = [...recurringSchedules];
                            newSchedules[index].end_time = e.target.value;
                            setRecurringSchedules(newSchedules);
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1 ml-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">{t('rooms.classroom')}</label>
                        <button
                          type="button"
                          onClick={() => setRecurringSchedules(recurringSchedules.filter((_, i) => i !== index))}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <select
                        className="w-full text-xs border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white py-2 shadow-sm focus:ring-primary focus:border-primary outline-none transition-all"
                        value={schedule.room_id}
                        onChange={(e) => {
                          const newSchedules = [...recurringSchedules];
                          newSchedules[index].room_id = e.target.value;
                          setRecurringSchedules(newSchedules);
                        }}
                      >
                        <option value="">--</option>
                        {rooms.map(room => (
                          <option key={room.id} value={room.id}>{room.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {recurringSchedules.length === 0 && (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">
                    {t('classes.noRecurringSchedule')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Enrollment Section */}
          {editingId && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3 px-1">
                <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} />
                  {t('students.title')} ({enrollments.length})
                </label>
                <button
                  type="button"
                  onClick={() => setIsBulkEnrollOpen(true)}
                  className="text-[10px] bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all font-black uppercase tracking-wider"
                >
                  {t('common.bulkAdd')}
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <select
                  className="flex-1 text-sm border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">-- {t('students.addClass')} --</option>
                  {allStudents
                    .filter(s => !enrollments.find(e => e.id === s.id))
                    .map(student => (
                      <option key={student.id} value={student.id}>{student.full_name} ({student.email})</option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleEnrollStudent}
                  disabled={!selectedStudentId}
                  className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {t('common.add')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                {enrollments.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50 group hover:border-primary/20 transition-all">
                    <div className="flex items-center min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black flex-shrink-0">
                        {student.full_name.charAt(0)}
                      </div>
                      <div className="ml-3 truncate">
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">{student.full_name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{student.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnenrollStudent(student.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {enrollments.length === 0 && (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('students.noEnrollments')}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50"
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
          <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
            {allStudents
              .filter(s => !enrollments.find(e => e.id === s.id))
              .map(student => (
                <label key={student.id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    checked={selectedBulkIds.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBulkIds([...selectedBulkIds, student.id]);
                      } else {
                        setSelectedBulkIds(selectedBulkIds.filter(id => id !== student.id));
                      }
                    }}
                  />
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{student.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{student.email}</p>
                  </div>
                </label>
              ))}
            {allStudents.filter(s => !enrollments.find(e => e.id === s.id)).length === 0 && (
              <p className="p-4 text-center text-sm text-gray-500">{t('common.noData')}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBulkEnroll}
              disabled={selectedBulkIds.length === 0}
              className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {t('common.add')} ({selectedBulkIds.length})
            </button>
            <button
              onClick={() => setIsBulkEnrollOpen(false)}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium"
            >
              {t('common.cancel')}
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
      />
    </div>
  );
};

export default Classes;

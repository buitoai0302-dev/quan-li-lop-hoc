import React from 'react';
import { Calendar, Clock, Plus, Search, Users, X } from 'lucide-react';
import type { ClassFormProps } from '../../../types';

const ClassForm: React.FC<ClassFormProps> = ({
  formData,
  setFormData,
  branches,
  teachers,
  rooms,
  allStudents,
  recurringSchedules,
  setRecurringSchedules,
  enrollments,
  selectedStudentId,
  setSelectedStudentId,
  onEnrollStudent,
  onUnenrollStudent,
  onOpenBulkEnroll,
  onClose,
  isSubmitting,
  t,
  startDateRef,
  endDateRef
}) => {
  const handleShowPicker = (ref: React.RefObject<HTMLInputElement>) => {
    const input = ref.current as any;
    if (input) {
      if ('showPicker' in input) input.showPicker();
      else input.click();
    }
  };

  return (
    <div className="space-y-6">
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
              <div className="relative group cursor-pointer" onClick={() => handleShowPicker(startDateRef)}>
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
              <div className="relative group cursor-pointer" onClick={() => handleShowPicker(endDateRef)}>
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
            onClick={onOpenBulkEnroll}
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
            onClick={onEnrollStudent}
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
                onClick={() => onUnenrollStudent(s.id)}
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
          onClick={onClose}
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
    </div>
  );
};

export default ClassForm;

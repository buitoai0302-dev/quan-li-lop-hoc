import React from 'react';
import { Calendar, Info, User, MapPin, FileText } from 'lucide-react';
import Modal from '../common/Modal';
import type { ClassData, Room, Teacher, Session } from '../../types';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSession: Session | null;
  formData: any;
  setFormData: (data: any) => void;
  classes: ClassData[];
  rooms: Room[];
  teachers: Teacher[];
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onClassChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  t: any;
}

const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  editingSession,
  formData,
  setFormData,
  classes,
  rooms,
  teachers,
  onSubmit,
  onDelete,
  onClassChange,
  t
}) => {
  const modalDateInputRef = React.useRef<HTMLInputElement>(null);

  const handleShowPicker = () => {
    const input = modalDateInputRef.current as any;
    if (input) {
      if ('showPicker' in input) input.showPicker();
      else input.click();
    }
  };

  const selectedClass = classes.find(c => c.id === formData.classId);
  const branchId = selectedClass?.branch_id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSession ? t('schedule.editSession') : t('schedule.addSession')}
      maxWidth="max-w-xl"
    >
      <form onSubmit={onSubmit} className="space-y-3 py-0.5">
        <div className="bg-blue-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-blue-100/50 dark:border-indigo-500/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-600 dark:text-indigo-300 uppercase ml-1">{t('schedule.date')} *</label>
              <div className="relative group cursor-pointer" onClick={handleShowPicker}>
                <input
                  ref={modalDateInputRef}
                  required type="date"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-md text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none transition-all cursor-pointer"
                />
                <Calendar size={14} className="absolute left-2.5 top-2 text-blue-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-blue-600 dark:text-indigo-300 uppercase ml-1">{t('schedule.startTime')} *</label>
                <input
                  required type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-md text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-blue-600 dark:text-indigo-300 uppercase ml-1">{t('schedule.endTime')} *</label>
                <input
                  required type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-md text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-0.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('schedule.class')} *</label>
              <div className="relative group">
                <select
                  required
                  value={formData.classId}
                  onChange={onClassChange}
                  className="w-full pl-8 pr-10 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
                >
                  <option value="" disabled>---</option>
                  {classes.filter(c => c.status !== 'cancelled').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Info size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('schedule.teacher')} *</label>
              <div className="relative group">
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full pl-8 pr-10 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
                >
                  <option value="" disabled>---</option>
                  {teachers
                    .filter(t => t.is_active !== false)
                    .filter(t => !branchId || t.branch_id === branchId)
                    .map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <User size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-1 space-y-1">
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('schedule.room')} *</label>
              <div className="relative group">
                <select
                  required
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  className="w-full pl-8 pr-10 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
                >
                  <option value="" disabled>---</option>
                  {rooms
                    .filter(r => r.is_active !== false)
                    .filter(r => !branchId || r.branch_id === branchId)
                    .map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <MapPin size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('common.notes')}</label>
              <div className="relative group">
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full pl-8 pr-2 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md text-xs font-medium text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                  placeholder={t('schedule.notesPlaceholder')}
                />
                <FileText size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
          <button
            type="submit"
            className="flex-1 py-2.5 bg-primary text-white font-black rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all text-xs uppercase tracking-widest active:scale-[0.98]"
          >
            {editingSession ? t('common.update') : t('common.save')}
          </button>
          {editingSession ? (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-100 transition-all text-[10px] uppercase tracking-widest border border-red-100 dark:border-red-500/10"
            >
              {t('common.delete')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-bold rounded-lg hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest"
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default SessionFormModal;

import React from 'react';
import type { RoomFormProps } from '../../../types';
import { ROOM_TYPES } from '../../../utils/constants';

const RoomForm: React.FC<RoomFormProps> = ({
  formData,
  setFormData,
  branches,
  isSubmitting,
  onClose,
  t
}) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('rooms.name')} *</label>
          <input
            required
            type="text"
            placeholder={t('rooms.namePlaceholder')}
            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('classes.branch')} *</label>
          <select
            required
            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
            value={formData.branch_id}
            onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
          >
            <option value="" disabled>---</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('rooms.type')}</label>
          <select
            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
            value={formData.room_type}
            onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
          >
            <option value={ROOM_TYPES.CLASSROOM}>{t('rooms.classroom')}</option>
            <option value={ROOM_TYPES.LAB}>{t('rooms.lab')}</option>
            <option value={ROOM_TYPES.MEETING}>{t('rooms.meeting')}</option>
          </select>
        </div>
      </div>

      <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('rooms.capacity')}</label>
            <input
              type="number"
              min="1"
              className="w-full bg-white dark:bg-gray-800 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('common.status')}</label>
            <select
              className="w-full bg-white dark:bg-gray-800 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all text-sm font-bold dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
              value={formData.is_active ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
            >
              <option value="true">{t('common.active')}</option>
              <option value="false">{t('common.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
};

export default RoomForm;

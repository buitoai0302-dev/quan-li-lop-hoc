import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { ClassTableProps } from '../../../types';
import { CLASS_STATUS } from '../../../utils/constants';

const ClassTable: React.FC<ClassTableProps> = ({ classes, onEdit, onDelete, t }) => {
  return (
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
          {classes.map((cls) => (
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
                <span className={`px-2 py-0.5 inline-flex text-[9px] font-black rounded-full uppercase tracking-tighter ${cls.status === CLASS_STATUS.ACTIVE ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {cls.status === CLASS_STATUS.ACTIVE ? t('common.active') : t('common.inactive')}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button onClick={() => onEdit(cls)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all active:scale-90">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => onDelete(cls.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClassTable;

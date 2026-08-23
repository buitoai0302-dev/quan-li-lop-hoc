import { Edit2, Trash2 } from 'lucide-react';
import type { ClassTableProps } from '../types';
import { CLASS_STATUS } from '@/utils/constants';
import { Badge } from '@/components/common/UI';

const ClassTable: React.FC<ClassTableProps> = ({
  classes,
  onEdit,
  onDelete,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  t,
}) => {
  const allSelected = classes.length > 0 && classes.every((cls) => selectedIds.includes(cls.id));

  return (
    <div className="overflow-x-auto w-full custom-scrollbar">
      <table className="w-full border-separate border-spacing-0">
        <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-20 transition-colors">
          <tr>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left w-12 border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {onSelectAll && (
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              )}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.name')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.branch')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.teacher')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.capacity')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {classes.map((cls) => (
            <tr
              key={cls.id}
              className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group ${selectedIds.includes(cls.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
            >
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                {onSelectOne && (
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                    checked={selectedIds.includes(cls.id)}
                    onChange={(e) => onSelectOne(cls.id, e.target.checked)}
                  />
                )}
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xs shrink-0 relative">
                    {cls.name.charAt(0).toUpperCase()}
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white dark:border-slate-900 rounded-full ${cls.status === CLASS_STATUS.ACTIVE ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      title={
                        cls.status === CLASS_STATUS.ACTIVE
                          ? t('common.active')
                          : t('common.inactive')
                      }
                    />
                  </div>
                  <div className="min-w-0 max-w-[150px] sm:max-w-[100px] lg:max-w-[200px]">
                    <div
                      className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors"
                      title={cls.name}
                    >
                      {cls.name}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {cls.teacher_name || t('classes.unassigned')}
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {cls.branch_name || '---'}
              </td>
              <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {cls.teacher_name || t('classes.unassigned')}
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <Badge variant="secondary" size="xs" className="font-bold whitespace-nowrap">
                  {cls.max_capacity} {t('classes.students')}
                </Badge>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <div className="flex justify-end gap-1 sm:gap-2">
                  <button
                    onClick={() => onEdit(cls)}
                    className="p-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all active:scale-90"
                    title={t('common.edit')}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(cls.id)}
                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90"
                    title={t('common.delete')}
                  >
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

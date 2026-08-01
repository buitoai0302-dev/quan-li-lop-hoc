import { Edit2, Trash2 } from 'lucide-react';
import type {  ClassTableProps  } from '../types';
import { CLASS_STATUS } from '@/utils/constants';
import { Badge, Button } from '@/components/common/UI';

const ClassTable: React.FC<ClassTableProps> = ({ classes, onEdit, onDelete, t }) => {
  return (
    <div className="overflow-x-auto w-full custom-scrollbar">
      <table className="w-full border-separate border-spacing-0">
        <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-20 transition-colors">
          <tr>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.name')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden lg:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.branch')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden md:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.teacher')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden sm:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.capacity')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden sm:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('common.status')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {classes.map((cls) => (
            <tr
              key={cls.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xs shrink-0">
                    {cls.name.charAt(0).toUpperCase()}
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
              <td className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {cls.branch_name || '---'}
              </td>
              <td className="hidden md:table-cell px-6 py-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {cls.teacher_name || t('classes.unassigned')}
              </td>
              <td className="hidden sm:table-cell px-6 py-4">
                <Badge variant="secondary" size="xs" className="font-bold whitespace-nowrap">
                  {cls.max_capacity} {t('classes.students')}
                </Badge>
              </td>
              <td className="hidden sm:table-cell px-6 py-4">
                <Badge variant={cls.status === CLASS_STATUS.ACTIVE ? 'success' : 'muted'}>
                  {cls.status === CLASS_STATUS.ACTIVE ? t('common.active') : t('common.inactive')}
                </Badge>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(cls)}
                    className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(cls.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={16} />
                  </Button>
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

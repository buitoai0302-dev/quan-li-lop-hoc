import React from 'react';
import { Edit2, Trash2, KeyRound } from 'lucide-react';
import type { TeacherTableProps } from '../types';
import RowActions from '@/components/common/RowActions';

const TeacherTable: React.FC<TeacherTableProps & { onResetPassword?: (teacher: any) => void }> = ({
  teachers,
  canManage,
  onEdit,
  onDelete,
  onResetPassword,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  t,
}) => {
  const allSelected = teachers.length > 0 && teachers.every((t) => selectedIds.includes(t.id));

  return (
    <div className="w-full overflow-x-auto">
      <table className="management-table w-full table-fixed border-separate border-spacing-0">
        <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-20 transition-colors">
          <tr>
            {canManage && (
              <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap text-left  border-b border-gray-100 dark:border-slate-800 shadow-sm w-10 sm:w-12">
                {onSelectAll && (
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                    aria-label={t('common.selectAll')}
                    checked={allSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                  />
                )}
              </th>
            )}
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm ">
              {t('teachers.name')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden xl:table-cell px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm w-1/5">
              {t('classes.branch')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden sm:table-cell px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm w-1/5">
              {t('teachers.specialization')}
            </th>

            {canManage && (
              <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm w-26 sm:w-32">
                {t('common.actions')}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {teachers.map((teacher) => (
            <tr
              key={teacher.id}
              className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group ${selectedIds.includes(teacher.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
            >
              {canManage && (
                <td className="px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap">
                  {onSelectOne && (
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                      aria-label={t('common.selectItem', { name: teacher.full_name })}
                      checked={selectedIds.includes(teacher.id)}
                      onChange={(e) => onSelectOne(teacher.id, e.target.checked)}
                    />
                  )}
                </td>
              )}
              <td className="px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xs shrink-0 relative">
                    {teacher.full_name.substring(0, 2).toUpperCase()}
                    <span
                      className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${teacher.is_active ? 'bg-green-500' : 'bg-red-500'}`}
                      title={teacher.is_active ? t('common.active') : t('common.inactive')}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="whitespace-normal break-words text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                      {teacher.full_name}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {teacher.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden xl:table-cell px-2 sm:px-3 py-3 sm:py-4 whitespace-normal break-words text-xs font-medium text-gray-600 dark:text-gray-400">
                {teacher.branch_name || '---'}
              </td>
              <td className="hidden sm:table-cell px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                {teacher.specialization || '---'}
              </td>

              {canManage && (
                <td className="px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap text-right">
                  <RowActions
                    actions={[
                      ...(onResetPassword
                        ? [
                            {
                              label: t('admin.users.tooltip.reset'),
                              icon: <KeyRound size={16} />,
                              onClick: () => onResetPassword(teacher),
                            },
                          ]
                        : []),
                      {
                        label: t('common.edit'),
                        icon: <Edit2 size={16} />,
                        onClick: () => onEdit(teacher),
                        mobilePrimary: true,
                      },
                      {
                        label: t('common.delete'),
                        icon: <Trash2 size={16} />,
                        onClick: () => onDelete(teacher.id),
                        tone: 'danger',
                      },
                    ]}
                  />{' '}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeacherTable;

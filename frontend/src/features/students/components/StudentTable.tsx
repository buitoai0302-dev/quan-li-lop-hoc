import React from 'react';
import type { StudentTableProps } from '../types';

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onEdit,
  onDelete,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  t,
}) => {
  const allSelected = students.length > 0 && selectedIds.length === students.length;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 min-w-[800px]">
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
              {t('students.name')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.branch')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('students.dob')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('common.status')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {students.map((student) => (
            <tr
              key={student.id}
              className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group ${selectedIds.includes(student.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
            >
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                {onSelectOne && (
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                    checked={selectedIds.includes(student.id)}
                    onChange={(e) => onSelectOne(student.id, e.target.checked)}
                  />
                )}
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center text-primary font-bold shadow-inner">
                    {student.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">
                      {student.full_name}
                    </div>
                    {student.email && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        {student.email}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                {student.branch_name ? (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>
                    {student.branch_name}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {student.date_of_birth
                    ? new Date(student.date_of_birth).toLocaleDateString('vi-VN')
                    : '-'}
                </div>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                    student.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-2 ${student.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  ></span>
                  {student.is_active ? t('common.active') : t('common.inactive')}
                </span>
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2 transition-opacity">
                  <button
                    onClick={() => onEdit?.(student)}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title={t('common.edit')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete?.(student.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title={t('common.delete')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
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

export default StudentTable;

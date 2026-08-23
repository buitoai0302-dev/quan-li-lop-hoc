import React from 'react';
import { Phone, Users, Edit2, Trash2, Calendar } from 'lucide-react';
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
  const allSelected = students.length > 0 && students.every((s) => selectedIds.includes(s.id));

  return (
    <div className="w-full overflow-x-auto">
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
              {t('students.name')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.branch')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('students.dob')}
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
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center text-primary font-bold text-[10px] sm:text-sm shadow-inner relative shrink-0">
                      {student.full_name.charAt(0).toUpperCase()}
                      <span
                        className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-white dark:border-slate-900 rounded-full ${student.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        title={student.is_active ? t('common.active') : t('common.inactive')}
                      />
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">
                      {student.full_name}
                    </div>
                  </div>

                  <div className="mt-1.5 flex flex-col gap-1">
                    {student.email && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                        {student.email}
                      </div>
                    )}
                    {(student.phone || student.parent_phone) && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-1 sm:gap-2">
                        {student.phone && (
                          <span
                            className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded w-fit"
                            title="Số điện thoại Học sinh"
                          >
                            <Phone size={10} className="text-gray-400" />
                            <span>{student.phone}</span>
                          </span>
                        )}
                        {student.parent_phone && (
                          <span
                            className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded w-fit"
                            title="Số điện thoại Phụ huynh"
                          >
                            <Users size={10} className="text-gray-400" />
                            <span>{student.parent_phone}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {/* Mobile Only Info */}
                    <div className="sm:hidden mt-1 flex flex-wrap items-center gap-2">
                      {student.branch_name && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold rounded flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                          {student.branch_name}
                        </span>
                      )}
                      {student.date_of_birth && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold rounded flex items-center gap-1">
                          <Calendar size={10} className="text-slate-400" />
                          {new Date(student.date_of_birth).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                {student.branch_name ? (
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                    {student.branch_name}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                {student.date_of_birth ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20 shadow-sm text-xs font-bold">
                    <Calendar size={12} className="opacity-70" />
                    {new Date(student.date_of_birth).toLocaleDateString('vi-VN')}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </td>

              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-1 sm:gap-2">
                  <button
                    onClick={() => onEdit?.(student)}
                    className="p-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all active:scale-90"
                    title={t('common.edit')}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete?.(student.id)}
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

export default StudentTable;

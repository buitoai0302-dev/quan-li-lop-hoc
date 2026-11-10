import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { BranchTableProps } from '../types';
import type { Branch } from '@/types/schemas';
import ActiveIndicator from '@/components/common/ActiveIndicator';
import ActionHint from '@/components/common/ActionHint';

const BranchTable: React.FC<BranchTableProps> = ({
  branches,
  onEdit,
  onDelete,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  t,
}) => {
  const allSelected = branches.length > 0 && branches.every((b) => selectedIds.includes(b.id));

  return (
    <div className="w-full overflow-x-auto">
      <table className="management-table w-full border-separate border-spacing-0">
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
              {t('branches.name')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('branches.address')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('branches.phone')}
            </th>

            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {branches.map((branch: Branch) => (
            <tr
              key={branch.id}
              className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group ${selectedIds.includes(branch.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
            >
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                {onSelectOne && (
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                    checked={selectedIds.includes(branch.id)}
                    onChange={(e) => onSelectOne(branch.id, e.target.checked)}
                  />
                )}
              </td>
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xs shrink-0 relative">
                    {branch.name.charAt(0).toUpperCase()}
                    <ActiveIndicator active={Boolean(branch.is_active)} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                      {branch.name}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate md:hidden">
                      {branch.address}
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400 truncate max-w-xs">
                {branch.address || '---'}
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                {branch.phone || '---'}
              </td>

              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <div className="flex justify-end gap-1 sm:gap-2">
                  <ActionHint label={t('common.edit')} showTouchLabel={false}>
                    <button
                      onClick={() => onEdit(branch)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-indigo-600 sm:min-h-8 sm:min-w-8 dark:text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all active:scale-90"
                    >
                      <Edit2 size={16} />
                    </button>
                  </ActionHint>
                  <ActionHint label={t('common.delete')} showTouchLabel={false}>
                    <button
                      onClick={() => onDelete(branch.id)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-red-600 sm:min-h-8 sm:min-w-8 dark:text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                  </ActionHint>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BranchTable;

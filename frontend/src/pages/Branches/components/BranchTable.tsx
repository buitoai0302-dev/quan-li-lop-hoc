import React from 'react';
import type { Branch, BranchTableProps } from '../../../types';

const BranchTable: React.FC<BranchTableProps> = ({ branches, onEdit, onDelete, t }) => {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full">
        <thead className="bg-gray-50/50 dark:bg-gray-900/20 sticky top-0 z-10 border-b border-gray-100 dark:border-gray-700/50">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('branches.name')}</th>
            <th className="hidden md:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('branches.address')}</th>
            <th className="hidden sm:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('branches.phone')}</th>
            <th className="hidden sm:table-cell px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.status')}</th>
            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {branches.map((branch) => (
            <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xs shrink-0">
                    {branch.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">{branch.name}</div>
                    <div className="text-[10px] text-gray-500 truncate md:hidden">{branch.address}</div>
                  </div>
                </div>
              </td>
              <td className="hidden md:table-cell px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-400 truncate max-w-xs">
                {branch.address || '---'}
              </td>
              <td className="hidden sm:table-cell px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                {branch.phone || '---'}
              </td>
              <td className="hidden sm:table-cell px-6 py-4">
                <span className={`px-2 py-0.5 inline-flex text-[9px] font-black rounded-full uppercase tracking-tighter ${branch.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {branch.is_active ? t('common.active') : t('common.inactive')}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button onClick={() => onEdit(branch)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => onDelete(branch.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

export default BranchTable;

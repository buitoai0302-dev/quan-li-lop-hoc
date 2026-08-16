import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { RoomTableProps } from '../types';

const RoomTable: React.FC<RoomTableProps> = ({ rooms, onEdit, onDelete, t }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-20 transition-colors">
          <tr>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('rooms.name')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('classes.branch')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('rooms.capacity')}
            </th>
            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('rooms.type')}
            </th>

            <th className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 shadow-sm">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {rooms.map((room) => (
            <tr
              key={room.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
            >
              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xs shrink-0 relative">
                    {room.name.charAt(0).toUpperCase()}
                    <span
                      className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${room.is_active ? 'bg-green-500' : 'bg-red-500'}`}
                      title={room.is_active ? t('common.active') : t('common.inactive')}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                      {room.name}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {t(`rooms.${room.room_type || 'classroom'}`)}
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs font-bold text-gray-600 dark:text-gray-400">
                {room.branch_name || '---'}
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                {room.capacity}
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                {t(`rooms.${room.room_type || 'classroom'}`)}
              </td>

              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <div className="flex justify-end gap-1 sm:gap-2">
                  <button
                    onClick={() => onEdit(room)}
                    className="p-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all active:scale-90"
                    title={t('common.edit')}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(room.id)}
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

export default RoomTable;

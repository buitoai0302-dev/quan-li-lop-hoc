import React, { useState } from 'react';
import { Search } from 'lucide-react';
import Modal from '../../../components/Modal';
import type { BulkEnrollModalProps } from '../../../types';

const BulkEnrollModal: React.FC<BulkEnrollModalProps> = ({
  isOpen,
  onClose,
  allStudents,
  enrollments,
  onBulkEnroll,
  t
}) => {
  const [bulkSearch, setBulkSearch] = useState('');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  const filteredStudents = allStudents
    .filter(s => !enrollments.find(e => e.id === s.id))
    .filter(s => s.full_name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(bulkSearch.toLowerCase()));

  const handleToggleStudent = (studentId: string) => {
    if (selectedBulkIds.includes(studentId)) {
      setSelectedBulkIds(selectedBulkIds.filter(id => id !== studentId));
    } else {
      setSelectedBulkIds([...selectedBulkIds, studentId]);
    }
  };

  const handleConfirm = () => {
    onBulkEnroll(selectedBulkIds);
    setSelectedBulkIds([]);
    setBulkSearch('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('common.bulkAdd')}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder={t('common.search')}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/20 outline-none"
            value={bulkSearch}
            onChange={(e) => setBulkSearch(e.target.value)}
          />
        </div>
        <div className="max-h-80 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl divide-y dark:divide-gray-700">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">
              {t('common.noResults')}
            </div>
          ) : (
            filteredStudents.map(student => (
              <label key={student.id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  checked={selectedBulkIds.includes(student.id)}
                  onChange={() => handleToggleStudent(student.id)}
                />
                <div className="ml-3">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{student.full_name}</p>
                  <p className="text-[10px] text-gray-500">{student.email}</p>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedBulkIds.length === 0}
            className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50"
          >
            {t('common.add')} ({selectedBulkIds.length})
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkEnrollModal;

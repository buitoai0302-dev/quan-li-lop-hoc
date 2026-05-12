import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Modal, Button, Input } from '@/components/common/UI';
import type { BulkEnrollModalProps } from '@/types';

const BulkEnrollModal: React.FC<BulkEnrollModalProps> = ({
  isOpen,
  onClose,
  allStudents,
  enrollments,
  onBulkEnroll,
  t,
}) => {
  const [bulkSearch, setBulkSearch] = useState('');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  const filteredStudents = allStudents
    .filter((s) => !enrollments.find((e) => e.id === s.id))
    .filter(
      (s) =>
        s.full_name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(bulkSearch.toLowerCase()))
    );

  const handleToggleStudent = (studentId: string) => {
    if (selectedBulkIds.includes(studentId)) {
      setSelectedBulkIds(selectedBulkIds.filter((id) => id !== studentId));
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
    <Modal isOpen={isOpen} onClose={onClose} title={t('common.bulkAdd')} size="md">
      <div className="space-y-4">
        <Input
          placeholder={t('common.search')}
          value={bulkSearch}
          onChange={(e) => setBulkSearch(e.target.value)}
          icon={<Search />}
          size="sm"
        />
        <div className="max-h-80 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl divide-y dark:divide-gray-700">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">
              {t('common.noResults')}
            </div>
          ) : (
            filteredStudents.map((student) => (
              <label
                key={student.id}
                className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  checked={selectedBulkIds.includes(student.id)}
                  onChange={() => handleToggleStudent(student.id)}
                />
                <div className="ml-3">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    {student.full_name}
                  </p>
                  <p className="text-[10px] text-gray-500">{student.email}</p>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 uppercase tracking-widest text-[10px]"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedBulkIds.length === 0}
            className="flex-[2] uppercase tracking-widest text-[10px]"
          >
            {t('common.add')} ({selectedBulkIds.length})
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkEnrollModal;

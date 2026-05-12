import React, { useState, useMemo, useCallback } from 'react';
import { createBranch, updateBranch, deleteBranch } from '@/features/branches/api';
import { Modal, Card } from '@/components/common/UI';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';
import { Building, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import FilterBar from '@/components/common/FilterBar';
import EmptyState from '@/components/common/EmptyState';
import type { Branch } from '@/types';

import BranchTable from '@/features/branches/components/BranchTable';
import BranchForm from '@/features/branches/components/BranchForm';

import { useBranches } from '@/features/branches/hooks/useBranches';

const Branches: React.FC = () => {
  const { t } = useTranslation();
  const { branches, loading, refreshBranches } = useBranches();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingBranch, setEditingBranch] = useState<any>(null);

  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      const query = searchQuery.toLowerCase();
      return (
        branch.name.toLowerCase().includes(query) ||
        (branch.address && branch.address.toLowerCase().includes(query)) ||
        (branch.phone && branch.phone.includes(query))
      );
    });
  }, [branches, searchQuery]);

  const handleOpenModal = useCallback((branch?: Branch) => {
    if (branch) {
      setEditingId(branch.id);
      setEditingBranch({
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        is_active: !!branch.is_active,
      });
    } else {
      setEditingId(null);
      setEditingBranch(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
  }, []);

  const handleSubmit = useCallback(
    async (data: any) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        if (editingId) {
          await updateBranch(editingId, data);
          toast.success(t('common.success'));
        } else {
          await createBranch(data);
          toast.success(t('common.success'));
        }
        handleCloseModal();
        refreshBranches();
      } catch (error: any) {
        handleApiError(error, t);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingId, isSubmitting, t, handleCloseModal, refreshBranches]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteBranch(deletingId);
      toast.success(t('common.success'));
      setDeletingId(null);
      refreshBranches();
    } catch (error: any) {
      handleApiError(error, t);
    }
  }, [deletingId, t, refreshBranches]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={Building}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all border active:scale-95 ${
                isFilterVisible
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm'
              }`}
              title={t('common.filter')}
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="h-9 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 whitespace-nowrap flex items-center justify-center gap-2 group active:scale-95"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t('branches.addBranch')}</span>
            </button>
          </div>
        }
      >
        <FilterBar
          isVisible={isFilterVisible}
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
        />
      </PageHeader>

      <Card
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
        scrollable={true}
        footer={
          !loading &&
          filteredBranches.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredBranches.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          )
        }
      >
        {loading ? (
          <PageLoading />
        ) : filteredBranches.length === 0 ? (
          <EmptyState
            title={searchQuery ? t('common.noResults') : t('branches.noData')}
            icon={Building}
          />
        ) : (
          <BranchTable
            branches={filteredBranches.slice(
              (currentPage - 1) * itemsPerPage,
              currentPage * itemsPerPage
            )}
            onEdit={handleOpenModal}
            onDelete={setDeletingId}
            t={t}
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('branches.editBranch') : t('branches.addBranch')}
        size="xl"
      >
        <BranchForm
          initialData={editingBranch}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onClose={handleCloseModal}
          t={t}
        />
      </Modal>

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteWarning')}
        type="danger"
      />
    </div>
  );
};

export default Branches;

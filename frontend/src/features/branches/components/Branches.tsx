import React, { useState, useMemo, useCallback } from 'react';

import { Modal, Card, Button } from '@/components/common/UI';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';
import { Building } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import PageHeader from '@/components/common/PageHeader';
import { exportToExcel, exportToPDF } from '@/utils/export';
import type { ExportColumn } from '@/utils/export';
import SkeletonTable from '@/components/common/SkeletonTable';
import FilterBar from '@/components/common/FilterBar';
import EmptyState from '@/components/common/EmptyState';
import TableToolbar from '@/components/common/TableToolbar';
import { usePagination } from '@/hooks/usePagination';
import { useSelection } from '@/hooks/useSelection';
import type { Branch, BranchFormData } from '@/types';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';

import BranchTable from '@/features/branches/components/BranchTable';
import BranchForm from '@/features/branches/components/BranchForm';

import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useDeleteBulkBranches,
} from '@/features/branches/hooks/useBranches';

const Branches: React.FC = () => {
  const { t } = useTranslation();
  const { branches, loading } = useBranches();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [editingBranch, setEditingBranch] = useState<BranchFormData | null>(null);

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

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedItems: paginatedBranches,
  } = usePagination(filteredBranches);
  const { selectedIds, handleSelectAll, handleSelectOne, clearSelection } =
    useSelection(paginatedBranches);

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

  const { mutate: createBranchMutate, isPending: isCreating } = useCreateBranch();
  const { mutate: updateBranchMutate, isPending: isUpdating } = useUpdateBranch();
  const { mutate: deleteBranchMutate } = useDeleteBranch();
  const { mutate: deleteBulkBranchesMutate } = useDeleteBulkBranches();

  const isSubmitting = isCreating || isUpdating;

  const handleSubmit = useCallback(
    (data: BranchFormData) => {
      if (editingId) {
        updateBranchMutate(
          { id: editingId, data },
          {
            onSuccess: () => {
              toast.success(t('common.success'));
              handleCloseModal();
            },
            onError: (error: unknown) => {
              handleApiError(error as AxiosError<ApiErrorData>, t);
            },
          }
        );
      } else {
        createBranchMutate(data, {
          onSuccess: () => {
            toast.success(t('common.success'));
            handleCloseModal();
          },
          onError: (error: unknown) => {
            handleApiError(error as AxiosError<ApiErrorData>, t);
          },
        });
      }
    },
    [editingId, t, handleCloseModal, createBranchMutate, updateBranchMutate]
  );

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteBranchMutate(deletingId, {
      onSuccess: () => {
        toast.success(t('common.success'));
        setDeletingId(null);
      },
      onError: (error: unknown) => {
        handleApiError(error as AxiosError<ApiErrorData>, t);
      },
    });
  }, [deletingId, t, deleteBranchMutate]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    deleteBulkBranchesMutate(selectedIds, {
      onSuccess: () => {
        toast.success(t('common.success'));
        clearSelection();
        setIsBulkDeleteModalOpen(false);
      },
      onError: (error: unknown) => {
        handleApiError(error as AxiosError<ApiErrorData>, t);
        setIsBulkDeleteModalOpen(false);
      },
    });
  }, [selectedIds, deleteBulkBranchesMutate, t, clearSelection]);

  const handleExportExcel = () => {
    const columns: ExportColumn<Branch>[] = [
      { header: t('branches.name'), accessor: 'name' },
      { header: t('branches.address'), accessor: 'address' },
      { header: t('branches.phone'), accessor: 'phone' },
      { header: t('common.status'), accessor: (b) => (b.is_active ? 'Active' : 'Inactive') },
    ];
    exportToExcel(filteredBranches, columns, t('branches.title'));
  };

  const handleExportPDF = () => {
    const columns: ExportColumn<Branch>[] = [
      { header: t('branches.name'), accessor: 'name' },
      { header: t('branches.address'), accessor: 'address' },
      { header: t('branches.phone'), accessor: 'phone' },
      { header: t('common.status'), accessor: (b) => (b.is_active ? 'Active' : 'Inactive') },
    ];
    exportToPDF(filteredBranches, columns, t('branches.title'));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={Building}
        actions={
          <TableToolbar
            isFilterVisible={isFilterVisible}
            onToggleFilter={() => setIsFilterVisible(!isFilterVisible)}
            selectedCount={selectedIds.length}
            onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            isExportDisabled={filteredBranches.length === 0}
            onAdd={() => handleOpenModal()}
            addLabel={t('common.add')}
          />
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
          <div className="p-4 sm:p-6">
            <SkeletonTable columns={4} rows={5} />
          </div>
        ) : filteredBranches.length === 0 ? (
          <EmptyState
            title={searchQuery ? t('common.noResults') : t('branches.noData')}
            description={
              searchQuery
                ? t('common.tryDifferentSearch')
                : t('branches.createFirstBranch', 'Thêm chi nhánh đầu tiên của bạn')
            }
            showArrow={!searchQuery}
            icon={Building}
            action={
              !searchQuery ? (
                <Button
                  onClick={() => handleOpenModal()}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold"
                >
                  {t('branches.addBranch')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <BranchTable
            branches={paginatedBranches}
            onEdit={handleOpenModal}
            onDelete={(id) => setDeletingId(id)}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
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
          initialData={editingBranch || undefined}
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

      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteWarning')}
        type="danger"
      />
    </div>
  );
};

export default Branches;

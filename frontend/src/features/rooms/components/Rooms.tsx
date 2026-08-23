import React, { useState, useMemo, useCallback } from 'react';

import { Modal, Card, Button } from '@/components/common/UI';
import { DoorOpen } from 'lucide-react';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import { exportToExcel, exportToPDF } from '@/utils/export';
import type { ExportColumn } from '@/utils/export';
import SkeletonTable from '@/components/common/SkeletonTable';
import FilterBar from '@/components/common/FilterBar';
import FilterSelect from '@/components/common/FilterSelect';
import EmptyState from '@/components/common/EmptyState';
import TableToolbar from '@/components/common/TableToolbar';
import { usePagination } from '@/hooks/usePagination';
import { useSelection } from '@/hooks/useSelection';
import type { Room, RoomFormData } from '@/types';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';

import RoomTable from '@/features/rooms/components/RoomTable';
import RoomForm from '@/features/rooms/components/RoomForm';

import {
  useRooms,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
  useDeleteBulkRooms,
} from '@/features/rooms/hooks/useRooms';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { ROOM_TYPES } from '@/utils/constants';

const Rooms: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { rooms, loading: roomsLoading } = useRooms();
  const { branches, loading: branchesLoading } = useBranches();

  const loading = roomsLoading || branchesLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [editingRoom, setEditingRoom] = useState<RoomFormData | null>(null);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        room.name.toLowerCase().includes(query) ||
        t(`rooms.${room.room_type || ROOM_TYPES.CLASSROOM}`)
          .toLowerCase()
          .includes(query);

      const matchesBranch = branchFilter === '' || room.branch_id === branchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [rooms, searchQuery, branchFilter, t]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedItems: paginatedRooms,
  } = usePagination(filteredRooms);
  const { selectedIds, handleSelectAll, handleSelectOne, clearSelection } =
    useSelection(paginatedRooms);

  const handleOpenModal = useCallback(
    (room?: Room) => {
      if (room) {
        setEditingId(room.id);
        setEditingRoom({
          name: room.name,
          capacity: room.capacity || 30,
          room_type: room.room_type || ROOM_TYPES.CLASSROOM,
          branch_id: room.branch_id || (branches.length > 0 ? branches[0].id : ''),
          is_active: room.is_active ?? true,
        });
      } else {
        setEditingId(null);
        setEditingRoom(null);
      }
      setIsModalOpen(true);
    },
    [branches]
  );

  const { mutate: createRoomMutate, isPending: isCreating } = useCreateRoom();
  const { mutate: updateRoomMutate, isPending: isUpdating } = useUpdateRoom();
  const { mutate: deleteRoomMutate } = useDeleteRoom();
  const { mutate: deleteBulkRoomsMutate } = useDeleteBulkRooms();

  const isSubmitting = isCreating || isUpdating;

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
  }, []);

  const handleSubmit = useCallback(
    (data: RoomFormData) => {
      if (editingId) {
        updateRoomMutate(
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
        createRoomMutate(data, {
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
    [editingId, t, handleCloseModal, createRoomMutate, updateRoomMutate]
  );

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteRoomMutate(deletingId, {
      onSuccess: () => {
        toast.success(t('common.success'));
        setDeletingId(null);
      },
      onError: (error: unknown) => {
        handleApiError(error as AxiosError<ApiErrorData>, t);
      },
    });
  }, [deletingId, t, deleteRoomMutate]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    deleteBulkRoomsMutate(selectedIds, {
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
  }, [selectedIds, deleteBulkRoomsMutate, t]);

  const handleExportExcel = () => {
    const columns: ExportColumn<Room>[] = [
      { header: t('rooms.name'), accessor: 'name' },
      { header: t('rooms.capacity'), accessor: 'capacity' },
      { header: t('rooms.branch'), accessor: 'branch_name' },
      { header: t('common.status'), accessor: (r) => (r.is_active ? 'Active' : 'Inactive') },
    ];
    exportToExcel(filteredRooms, columns, t('rooms.title'));
  };

  const handleExportPDF = () => {
    const columns: ExportColumn<Room>[] = [
      { header: t('rooms.name'), accessor: 'name' },
      { header: t('rooms.capacity'), accessor: 'capacity' },
      { header: t('rooms.branch'), accessor: 'branch_name' },
      { header: t('common.status'), accessor: (r) => (r.is_active ? 'Active' : 'Inactive') },
    ];
    exportToPDF(filteredRooms, columns, t('rooms.title'));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={DoorOpen}
        actions={
          <TableToolbar
            isFilterVisible={isFilterVisible}
            onToggleFilter={() => setIsFilterVisible(!isFilterVisible)}
            selectedCount={selectedIds.length}
            onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            isExportDisabled={filteredRooms.length === 0}
            onImport={() => navigate('/import?type=rooms')}
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
        >
          <FilterSelect
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            placeholder={t('import.selectBranch')}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </FilterBar>
      </PageHeader>

      <Card
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
        scrollable={true}
        footer={
          !loading &&
          filteredRooms.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredRooms.length}
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
            <SkeletonTable columns={5} rows={5} />
          </div>
        ) : filteredRooms.length === 0 ? (
          <EmptyState
            title={searchQuery || branchFilter ? t('common.noResults') : t('rooms.noData')}
            description={
              searchQuery || branchFilter
                ? t('common.tryDifferentSearch')
                : t('rooms.createFirstRoom', 'Thêm phòng học đầu tiên của bạn')
            }
            showArrow={!(searchQuery || branchFilter)}
            icon={DoorOpen}
            action={
              !(searchQuery || branchFilter) ? (
                <Button
                  onClick={() => handleOpenModal()}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold"
                >
                  {t('rooms.addRoom')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <RoomTable
            rooms={paginatedRooms}
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
        title={editingId ? t('rooms.editRoom') : t('rooms.addRoom')}
        size="xl"
      >
        <RoomForm
          initialData={editingRoom || undefined}
          onSubmit={handleSubmit}
          branches={branches}
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

export default Rooms;

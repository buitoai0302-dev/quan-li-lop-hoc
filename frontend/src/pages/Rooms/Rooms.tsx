import React, { useState, useMemo, useCallback } from 'react';
import { createRoom, updateRoom, deleteRoom } from '@/features/rooms/api';
import { Modal, Card } from '@/components/common/UI';
import { DoorOpen, Plus, Upload, Search } from 'lucide-react';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import FilterBar from '@/components/common/FilterBar';
import FilterSelect from '@/components/common/FilterSelect';
import EmptyState from '@/components/common/EmptyState';
import type { Room } from '@/types';

import RoomTable from '@/features/rooms/components/RoomTable';
import RoomForm from '@/features/rooms/components/RoomForm';

import { useRooms } from '@/features/rooms/hooks/useRooms';
import { useBranches } from '@/features/branches/hooks/useBranches';

const Rooms: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { rooms, loading: roomsLoading, refreshRooms } = useRooms();
  const { branches, loading: branchesLoading } = useBranches();

  const loading = roomsLoading || branchesLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [editingRoom, setEditingRoom] = useState<any>(null);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        room.name.toLowerCase().includes(query) ||
        t(`rooms.${room.room_type || 'classroom'}`)
          .toLowerCase()
          .includes(query);

      const matchesBranch = branchFilter === '' || room.branch_id === branchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [rooms, searchQuery, branchFilter, t]);

  const handleOpenModal = useCallback(
    (room?: Room) => {
      if (room) {
        setEditingId(room.id);
        setEditingRoom({
          name: room.name,
          capacity: room.capacity || 30,
          room_type: room.room_type || 'classroom',
          branch_id: room.branch_id || (branches.length > 0 ? branches[0].id : ''),
          is_active: room.is_active,
        });
      } else {
        setEditingId(null);
        setEditingRoom(null);
      }
      setIsModalOpen(true);
    },
    [branches]
  );

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
          await updateRoom(editingId, data);
          toast.success(t('common.success'));
        } else {
          await createRoom(data);
          toast.success(t('common.success'));
        }
        handleCloseModal();
        refreshRooms();
      } catch (error: any) {
        handleApiError(error, t);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingId, isSubmitting, t, handleCloseModal, refreshRooms]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteRoom(deletingId);
      toast.success(t('common.success'));
      setDeletingId(null);
      refreshRooms();
    } catch (error: any) {
      handleApiError(error, t);
    }
  }, [deletingId, t, refreshRooms]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={DoorOpen}
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
              onClick={() => navigate('/import?type=rooms')}
              className="h-9 px-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100 dark:border-gray-700 whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">{t('common.import')}</span>
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="h-9 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 whitespace-nowrap flex items-center justify-center gap-2 group active:scale-95"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t('rooms.addRoom')}</span>
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
          <PageLoading />
        ) : filteredRooms.length === 0 ? (
          <EmptyState
            title={searchQuery ? t('common.noResults') : t('rooms.noData')}
            icon={DoorOpen}
          />
        ) : (
          <RoomTable
            rooms={filteredRooms.slice(
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
        title={editingId ? t('rooms.editRoom') : t('rooms.addRoom')}
        size="xl"
      >
        <RoomForm
          initialData={editingRoom}
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
    </div>
  );
};

export default Rooms;

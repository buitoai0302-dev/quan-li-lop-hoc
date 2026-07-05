import React, { useState, useMemo, useCallback } from 'react';

import { Modal, Card } from '@/components/common/UI';
import { DoorOpen, Plus, Upload, Search } from 'lucide-react';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '@/components/common/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import SkeletonTable from '@/components/common/SkeletonTable';
import FilterBar from '@/components/common/FilterBar';
import FilterSelect from '@/components/common/FilterSelect';
import EmptyState from '@/components/common/EmptyState';
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
} from '@/features/rooms/hooks/useRooms';
import { useBranches } from '@/features/branches/hooks/useBranches';

const Rooms: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { rooms, loading: roomsLoading } = useRooms();
  const { branches, loading: branchesLoading } = useBranches();

  const loading = roomsLoading || branchesLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [editingRoom, setEditingRoom] = useState<RoomFormData | null>(null);

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
            illustration={
              <svg
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-48 h-48 mx-auto"
              >
                <rect
                  x="60"
                  y="40"
                  width="80"
                  height="120"
                  rx="8"
                  className="fill-amber-50 dark:fill-amber-900/20 stroke-amber-200 dark:stroke-amber-800"
                  strokeWidth="4"
                />
                <path
                  d="M120 100c0 2.8-2.2 5-5 5s-5-2.2-5-5 2.2-5 5-5 5 2.2 5 5z"
                  className="fill-amber-400 dark:fill-amber-600"
                />
                <path
                  d="M40 160h120"
                  className="stroke-amber-200 dark:stroke-amber-800"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            }
            action={
              !(searchQuery || branchFilter) ? (
                <button
                  onClick={() => handleOpenModal()}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/25 active:scale-95"
                >
                  {t('rooms.addRoom')}
                </button>
              ) : undefined
            }
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
    </div>
  );
};

export default Rooms;

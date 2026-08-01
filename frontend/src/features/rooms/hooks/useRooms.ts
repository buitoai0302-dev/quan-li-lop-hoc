import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../api/rooms.api';
import type { RoomFormData } from '@/types/schemas';

export const useRooms = (branchId?: string) => {
  const query = useQuery({
    queryKey: ['rooms', branchId],
    queryFn: () => getRooms(branchId),
  });

  return {
    rooms: query.data || [],
    loading: query.isLoading,
    refreshRooms: query.refetch,
    query,
  };
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RoomFormData) => createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoomFormData }) => updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

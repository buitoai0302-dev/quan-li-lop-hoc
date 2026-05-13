import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/services/roomsService';

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

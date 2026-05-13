import { useQuery } from '@tanstack/react-query';
import { getTeachers } from '@/services/teachersService';

export const useTeachers = (branchId?: string) => {
  const query = useQuery({
    queryKey: ['teachers', branchId],
    queryFn: () => getTeachers(branchId),
  });

  return {
    teachers: query.data || [],
    loading: query.isLoading,
    refreshTeachers: query.refetch,
    query,
  };
};

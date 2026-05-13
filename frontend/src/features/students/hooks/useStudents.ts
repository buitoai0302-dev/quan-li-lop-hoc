import { useQuery } from '@tanstack/react-query';
import { getStudents } from '@/services/studentsService';

export const useStudents = (branchId?: string) => {
  const query = useQuery({
    queryKey: ['students', branchId],
    queryFn: () => getStudents(branchId),
  });

  return {
    students: query.data || [],
    loading: query.isLoading,
    refreshStudents: query.refetch,
    query,
  };
};

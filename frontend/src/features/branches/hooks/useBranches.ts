import { useQuery } from '@tanstack/react-query';
import { getBranches } from '../api';

export const useBranches = () => {
  const query = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
  });

  return {
    branches: query.data || [],
    loading: query.isLoading,
    refreshBranches: query.refetch,
    query,
  };
};

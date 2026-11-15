import { MutationCache, QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      // Aggregates can change after attendance, enrollment, schedule or payment writes.
      void queryClient.invalidateQueries({ queryKey: ['work-items'] });
      void queryClient.invalidateQueries({ queryKey: ['student-profile'] });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

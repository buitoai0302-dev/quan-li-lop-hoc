import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPublicSettings, getAdminSettings, updateSettings } from '../api/system.api';
import type { SystemSettings } from '../api/system.api';

export const usePublicSettings = () => {
  return useQuery({
    queryKey: ['system-settings-public'],
    queryFn: getPublicSettings,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
};

export const useAdminSettings = () => {
  return useQuery({
    queryKey: ['system-settings-admin'],
    queryFn: getAdminSettings,
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SystemSettings>) => updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings-public'] });
    },
  });
};

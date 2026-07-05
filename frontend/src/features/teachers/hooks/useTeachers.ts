import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from '@/services/teachersService';
import type { TeacherFormData } from '@/types';

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

export const useCreateTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TeacherFormData) => createTeacher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TeacherFormData }) => updateTeacher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTeacher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
};

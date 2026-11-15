import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../api/students.api';
import type { StudentFormData } from '@/types/schemas';
import { useWorkflowScope } from '@/hooks/useWorkflowState';

export const useStudents = (branchId?: string) => {
  const scope = useWorkflowScope();
  const query = useQuery({
    queryKey: ['students', scope, branchId],
    queryFn: ({ signal }) => getStudents(branchId, signal),
  });

  return {
    students: query.data || [],
    loading: query.isLoading,
    refreshStudents: query.refetch,
    query,
  };
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StudentFormData) => createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudentFormData }) => updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useDeleteBulkStudents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Execute all delete requests in parallel
      await Promise.all(ids.map((id) => deleteStudent(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

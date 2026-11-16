import { useQuery } from '@tanstack/react-query';
import { getBranches } from '@/features/branches';
import { getTeachers } from '@/features/teachers';
import { getRooms } from '@/features/rooms';
import { getStudents } from '@/features/students';
import type { ClassData, Branch, Teacher, Room, Student } from '@/types/schemas';

/**
 * Hook to manage class data and related entities using TanStack Query
 */
export const useClasses = (includeEditorData = true) => {
  // Individual queries for each entity type for better caching and parallel fetching
  const classesQuery = useQuery<ClassData[]>({
    queryKey: ['classes'],
    queryFn: getClasses,
  });

  const branchesQuery = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: getBranches,
  });

  const teachersQuery = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: () => getTeachers(),
    enabled: includeEditorData,
  });

  const roomsQuery = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: () => getRooms(),
    enabled: includeEditorData,
  });

  const studentsQuery = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => getStudents(),
    enabled: includeEditorData,
  });

  const activeQueries = [
    classesQuery,
    branchesQuery,
    ...(includeEditorData ? [teachersQuery, roomsQuery, studentsQuery] : []),
  ];
  const isLoading = activeQueries.some((query) => query.isLoading);
  const refreshData = () => Promise.all(activeQueries.map((query) => query.refetch()));

  return {
    classes: classesQuery.data || [],
    branches: branchesQuery.data || [],
    teachers: teachersQuery.data || [],
    rooms: roomsQuery.data || [],
    allStudents: studentsQuery.data || [],
    loading: isLoading,
    hasLoadError: activeQueries.some((query) => query.isError && query.data === undefined),
    isFetching: activeQueries.some((query) => query.isFetching),
    refreshClasses: refreshData,
  };
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getClasses, createClass, updateClass, deleteClass } from '../api/classes.api';

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateClass>[1] }) =>
      updateClass(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
};

export const useDeleteBulkClasses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteClass(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
};

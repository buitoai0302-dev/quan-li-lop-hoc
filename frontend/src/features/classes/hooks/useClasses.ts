import { useQuery } from '@tanstack/react-query';
import { getBranches } from '@/features/branches';
import { getTeachers } from '@/features/teachers';
import { getRooms } from '@/features/rooms';
import { getStudents } from '@/features/students';
import type { ClassData, Branch, Teacher, Room, Student } from '@/types/schemas';

/**
 * Hook to manage class data and related entities using TanStack Query
 */
export const useClasses = () => {
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
  });

  const roomsQuery = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: () => getRooms(),
  });

  const studentsQuery = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  });

  const isLoading =
    classesQuery.isLoading ||
    branchesQuery.isLoading ||
    teachersQuery.isLoading ||
    roomsQuery.isLoading ||
    studentsQuery.isLoading;

  const refreshData = async () => {
    await Promise.all([
      classesQuery.refetch(),
      branchesQuery.refetch(),
      teachersQuery.refetch(),
      roomsQuery.refetch(),
      studentsQuery.refetch(),
    ]);
  };

  return {
    classes: classesQuery.data || [],
    branches: branchesQuery.data || [],
    teachers: teachersQuery.data || [],
    rooms: roomsQuery.data || [],
    allStudents: studentsQuery.data || [],
    loading: isLoading,
    refreshClasses: refreshData,
  };
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getClasses, createClass, updateClass, deleteClass } from '../api/classes.api';
import type { ClassBasicFormData } from '@/types/schemas';

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ClassBasicFormData) => createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClassBasicFormData }) => updateClass(id, data),
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

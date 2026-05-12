import { useQuery } from '@tanstack/react-query';
import { getBranches } from '../../branches/api';
import { getTeachers } from '../../teachers/api';
import { getRooms } from '../../rooms/api';
import { getStudents } from '../../students/api';
import { getClasses } from '../api';
import type { ClassData, Branch, Teacher, Room, Student } from '@/types';

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

import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import type { ClassData, Branch, Teacher, Room, Student } from '../types';
import { handleApiError } from '../utils/errorHelper';
import { useTranslation } from 'react-i18next';

/**
 * Hook to manage class data and related entities
 */
export const useClasses = () => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classesRes, branchesRes, teachersRes, roomsRes, studentsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/branches'),
        api.get('/teachers'),
        api.get('/rooms'),
        api.get('/students')
      ]);
      setClasses(classesRes.data);
      setBranches(branchesRes.data);
      setTeachers(teachersRes.data);
      setRooms(roomsRes.data);
      setAllStudents(studentsRes.data);
    } catch (error) {
      handleApiError(error, t);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    classes,
    branches,
    teachers,
    rooms,
    allStudents,
    loading,
    refreshClasses: fetchData
  };
};

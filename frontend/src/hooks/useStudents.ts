import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import type { Student } from '../types';
import { handleApiError } from '../utils/errorHelper';
import { useTranslation } from 'react-i18next';

export const useStudents = (branchId?: string) => {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const url = branchId ? `/students?branch_id=${branchId}` : '/students';
      const response = await api.get(url);
      setStudents(response.data);
    } catch (error) {
      handleApiError(error, t);
    } finally {
      setLoading(false);
    }
  }, [t, branchId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, refreshStudents: fetchStudents };
};

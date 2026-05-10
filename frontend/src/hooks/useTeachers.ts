import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import type { Teacher } from '../types';
import { handleApiError } from '../utils/errorHelper';
import { useTranslation } from 'react-i18next';

export const useTeachers = (branchId?: string) => {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const url = branchId ? `/teachers?branch_id=${branchId}` : '/teachers';
      const response = await api.get(url);
      setTeachers(response.data);
    } catch (error) {
      handleApiError(error, t);
    } finally {
      setLoading(false);
    }
  }, [t, branchId]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return { teachers, loading, refreshTeachers: fetchTeachers };
};

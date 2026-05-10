import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import type { Branch } from '../types';
import { handleApiError } from '../utils/errorHelper';
import { useTranslation } from 'react-i18next';

export const useBranches = () => {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/branches');
      setBranches(response.data);
    } catch (error) {
      handleApiError(error, t);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return { branches, loading, refreshBranches: fetchBranches };
};

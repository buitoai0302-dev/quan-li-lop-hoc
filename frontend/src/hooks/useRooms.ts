import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import type { Room } from '../types';
import { handleApiError } from '../utils/errorHelper';
import { useTranslation } from 'react-i18next';

export const useRooms = (branchId?: string) => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const url = branchId ? `/rooms?branch_id=${branchId}` : '/rooms';
      const response = await api.get(url);
      setRooms(response.data);
    } catch (error) {
      handleApiError(error, t);
    } finally {
      setLoading(false);
    }
  }, [t, branchId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return { rooms, loading, refreshRooms: fetchRooms };
};

import api from '@/api';
import type { Room } from '@/types';

export const getRooms = (branchId?: string) => {
  const url = branchId ? `/rooms?branch_id=${branchId}` : '/rooms';
  return api.get<Room[]>(url).then((res) => res.data);
};

export const createRoom = (data: any) => api.post('/rooms', data);
export const updateRoom = (id: string, data: any) => api.put(`/rooms/${id}`, data);
export const deleteRoom = (id: string) => api.delete(`/rooms/${id}`);

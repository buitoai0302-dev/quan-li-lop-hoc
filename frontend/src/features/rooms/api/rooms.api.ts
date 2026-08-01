import api from '@/api';
import { RoomSchema, safeParseArray } from '@/types/schemas';
import type { RoomFormData } from '@/types/schemas';

export const getRooms = (branchId?: string) => {
  const url = branchId ? `/rooms?branch_id=${branchId}` : '/rooms';
  return api.get<unknown>(url).then((res) => safeParseArray(RoomSchema, res.data, 'getRooms'));
};

export const createRoom = (data: RoomFormData) => api.post('/rooms', data);
export const updateRoom = (id: string, data: RoomFormData) => api.put(`/rooms/${id}`, data);
export const deleteRoom = (id: string) => api.delete(`/rooms/${id}`);

import api from '@/api';
import type { AttendanceRecord } from '../types';

export const getAttendanceForSession = (sessionId: string) =>
  api
    .get<{ attendance: AttendanceRecord[]; session: any }>(`/attendance/session/${sessionId}`)
    .then((res) => res.data);

export const saveAttendance = (sessionId: string, records: any[]) =>
  api.post(`/attendance/session/${sessionId}`, { records });

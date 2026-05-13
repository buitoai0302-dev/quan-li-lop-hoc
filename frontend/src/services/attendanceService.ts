import api from '@/api';

export const getAttendanceForSession = (sessionId: string) =>
  api
    .get(`/attendance/session/${sessionId}`)
    .then((res) => res.data);

export const saveAttendance = (sessionId: string, records: any[]) =>
  api.post(`/attendance/session/${sessionId}`, { records });

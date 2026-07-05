import api from '@/api';
import { SessionSchema, AttendanceRecordSchema, safeParse, safeParseArray } from '@/types/schemas';
import type { Session, AttendanceRecord } from '@/types/schemas';

export interface SessionsPayload {
  sessions: Session[];
}

export interface AttendancePayload {
  session: Session;
  attendance: AttendanceRecord[];
}

export interface AttendanceSaveRecord {
  student_id: string;
  status: string;
}

export const getWeeklySchedule = (
  startDate: string,
  endDate: string,
  branchId?: string,
  teacherId?: string,
  classId?: string
): Promise<SessionsPayload> => {
  let url = `/schedule/weekly?startDate=${startDate}&endDate=${endDate}`;
  if (branchId) url += `&branchId=${branchId}`;
  if (teacherId) url += `&teacherId=${teacherId}`;
  if (classId) url += `&classId=${classId}`;
  return api.get<{ data: unknown }>(url).then((res) => {
    const raw = res.data.data as { sessions?: unknown };
    return {
      sessions: safeParseArray(SessionSchema, raw?.sessions, 'getWeeklySchedule'),
    };
  });
};

export const createSession = (data: Record<string, unknown>) =>
  api.post('/schedule/sessions', data).then((res) => res.data);

export const updateSession = (id: string, data: Record<string, unknown>) =>
  api.put(`/schedule/sessions/${id}`, data).then((res) => res.data);

export const deleteSession = (id: string) =>
  api.delete(`/schedule/sessions/${id}`).then((res) => res.data);

export const getAttendanceForSession = (sessionId: string): Promise<AttendancePayload> =>
  api.get<unknown>(`/attendance/session/${sessionId}`).then((res) => {
    const raw = res.data as { session?: unknown; attendance?: unknown };
    return {
      session: safeParse(SessionSchema, raw?.session, 'getAttendanceForSession.session'),
      attendance: safeParseArray(
        AttendanceRecordSchema,
        raw?.attendance,
        'getAttendanceForSession.attendance'
      ),
    };
  });

export const saveAttendance = (sessionId: string, records: AttendanceSaveRecord[]) =>
  api.post(`/attendance/session/${sessionId}`, { records });

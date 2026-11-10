import api from '@/api';
import { CreatedSessionsResponseSchema, SessionSchema, safeParseArray } from '@/types/schemas';
import type { Session } from '@/types/schemas';

export interface SessionsPayload {
  sessions: Session[];
  maxBatchSessions?: number;
}

export interface CreateSessionRequest {
  classId: string;
  roomId: string;
  teacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  sessionType?: string;
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
    const raw = res.data.data as { sessions?: unknown; maxBatchSessions?: unknown };
    const limit = raw?.maxBatchSessions;
    return {
      sessions: safeParseArray(SessionSchema, raw?.sessions, 'getWeeklySchedule'),
      maxBatchSessions:
        typeof limit === 'number' && Number.isInteger(limit) && limit > 0 ? limit : undefined,
    };
  });
};

export const createSession = (data: Record<string, unknown>) =>
  api.post('/schedule/sessions', data).then((res) => res.data);

export const createSessions = (sessions: CreateSessionRequest[]) =>
  api
    .post<unknown>('/schedule/sessions/bulk', { sessions })
    .then(({ data }) => CreatedSessionsResponseSchema.parse(data).data);

export const updateSession = (id: string, data: Record<string, unknown>) =>
  api.put(`/schedule/sessions/${id}`, data).then((res) => res.data);

export const deleteSession = (id: string) =>
  api.delete(`/schedule/sessions/${id}`).then((res) => res.data);

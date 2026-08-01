import api from '@/api';
import { SessionSchema, AttendanceRecordSchema, safeParse, safeParseArray } from '@/types/schemas';
import type { Session, AttendanceRecord } from '@/types/schemas';

export interface AttendancePayload {
  session: Session;
  attendance: AttendanceRecord[];
}

export interface AttendanceSaveRecord {
  student_id: string;
  status: string;
}

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

import api from '@/api';
import { SessionSchema, AttendanceRecordSchema, safeParse, safeParseArray } from '@/types/schemas';
import type { Session, AttendanceRecord } from '@/types/schemas';
import { z } from 'zod';

const EditingPolicySchema = z.object({
  editable: z.boolean(),
  businessDate: z.string(),
  isPast: z.boolean(),
  isFuture: z.boolean(),
  reasonRequired: z.boolean(),
  canConfirmStudents: z.boolean(),
});
const AttendanceMetadataSchema = z.object({
  version: z.number().int().nonnegative(),
  editingPolicy: EditingPolicySchema,
});

export interface AttendancePayload {
  session: Session;
  attendance: AttendanceRecord[];
  version: number;
  editingPolicy: z.infer<typeof EditingPolicySchema>;
}

export interface AttendanceSaveRecord {
  student_id: string;
  status: string;
}

export const getAttendanceForSession = (
  sessionId: string,
  signal?: AbortSignal
): Promise<AttendancePayload> =>
  api.get<unknown>(`/attendance/session/${sessionId}`, { signal }).then((res) => {
    const raw = res.data as { session?: unknown; attendance?: unknown };
    return {
      ...AttendanceMetadataSchema.parse(raw),
      session: safeParse(SessionSchema, raw?.session, 'getAttendanceForSession.session'),
      attendance: safeParseArray(
        AttendanceRecordSchema,
        raw?.attendance,
        'getAttendanceForSession.attendance'
      ),
    };
  });

export const saveAttendance = (
  sessionId: string,
  records: AttendanceSaveRecord[],
  options: { expectedVersion: number; reason?: string; confirmedStudentIds?: string[] }
) =>
  api
    .post<{
      success: boolean;
      version: number;
    }>(`/attendance/session/${sessionId}`, { records, ...options })
    .then((response) => response.data);

const AuditSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  full_name: z.string(),
  actor_name: z.string(),
  before_status: z.string().nullable(),
  after_status: z.string(),
  reason: z.string().nullable(),
  confirmed_addition: z.boolean(),
  created_at: z.string(),
  version: z.number(),
});
export const getAttendanceHistory = (sessionId: string, offset: number, signal?: AbortSignal) =>
  api
    .get(`/attendance/session/${sessionId}/history`, { params: { offset }, signal })
    .then((response) =>
      z.object({ items: z.array(AuditSchema), hasMore: z.boolean() }).parse(response.data)
    );

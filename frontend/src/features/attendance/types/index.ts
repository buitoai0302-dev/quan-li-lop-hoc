import type { Session, AttendanceRecord } from '@/types';

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export type PendingAction = {
  type: 'session' | 'date';
  id?: string;
  date?: string;
} | null;

export type { Session, AttendanceRecord };

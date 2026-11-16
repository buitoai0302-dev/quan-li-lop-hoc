import pool from '../db';
import { ERROR_CODES, SESSION_STATUS } from '../utils/constants';
import { NotFoundError, ValidationError } from '../utils/errors';
import { assertTenantReferences } from './tenant-reference.service';
import type { ScheduleSuggestionsRequest } from '../validators/schedule-suggestions.validator';

export const SCHEDULE_SUGGESTIONS = {
  START_TIME: '07:00',
  END_TIME: '22:00',
  STEP_MINUTES: 15,
  MAX_RESULTS: 6,
} as const;
type Slot = ScheduleSuggestionsRequest['session'];
interface Room {
  id: string;
  name: string;
  capacity: number;
}
export interface ScheduleSuggestion extends Slot {
  roomName: string;
  kind: 'room' | 'time';
}
function minutes(time: string) {
  const [hours, minutes, seconds = 0] = time.split(':').map(Number);
  return hours * 60 + minutes + seconds / 60;
}
function formatTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
function overlaps(left: Slot, right: Slot) {
  return (
    left.sessionDate === right.sessionDate &&
    minutes(left.startTime) < minutes(right.endTime) &&
    minutes(right.startTime) < minutes(left.endTime) &&
    (left.classId === right.classId ||
      left.teacherId === right.teacherId ||
      left.roomId === right.roomId)
  );
}

export class ScheduleSuggestionsService {
  static async suggest(tenantId: string, request: ScheduleSuggestionsRequest) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const { session, excludeSessionId, draftSessions } = request;
      const slots = [session, ...draftSessions];
      await assertTenantReferences(
        client,
        tenantId,
        'classes',
        slots.map((slot) => slot.classId)
      );
      await assertTenantReferences(
        client,
        tenantId,
        'teachers',
        slots.map((slot) => slot.teacherId)
      );
      await assertTenantReferences(
        client,
        tenantId,
        'rooms',
        slots.map((slot) => slot.roomId)
      );
      if (excludeSessionId) {
        const current = await client.query(
          'SELECT id FROM schedule_sessions WHERE tenant_id = $1 AND id = $2',
          [tenantId, excludeSessionId]
        );
        if (!current.rowCount)
          throw new NotFoundError('Session not found', ERROR_CODES.SESSION_NOT_FOUND);
      }
      const classes = await client.query<{ branch_id: string; max_capacity: number }>(
        'SELECT branch_id, max_capacity FROM classes WHERE tenant_id = $1 AND id = $2 AND NOT is_deleted',
        [tenantId, session.classId]
      );
      if (!classes.rowCount)
        throw new ValidationError('Class unavailable', ERROR_CODES.INVALID_TENANT_REFERENCE);
      const selectedClass = classes.rows[0];
      const rooms = await client.query<Room>(
        'SELECT id, name, capacity FROM rooms WHERE tenant_id = $1 AND branch_id = $2 AND NOT is_deleted AND is_active ORDER BY name, id',
        [tenantId, selectedClass.branch_id]
      );
      const teacher = await client.query(
        'SELECT id FROM teachers WHERE tenant_id = $1 AND id = $2 AND NOT is_deleted AND is_active',
        [tenantId, session.teacherId]
      );
      if (!teacher.rowCount || !rooms.rows.some((room) => room.id === session.roomId))
        throw new ValidationError('Resource unavailable', ERROR_CODES.INVALID_TENANT_REFERENCE);
      const occupied = await client.query<Slot>(
        `SELECT class_id AS "classId", teacher_id AS "teacherId", room_id AS "roomId", session_date::text AS "sessionDate", start_time AS "startTime", end_time AS "endTime"
         FROM schedule_sessions WHERE tenant_id = $1 AND session_date = $2 AND status <> $3 AND ($4::uuid IS NULL OR id <> $4)`,
        [tenantId, session.sessionDate, SESSION_STATUS.CANCELLED, excludeSessionId || null]
      );
      const blocked = [...occupied.rows, ...draftSessions];
      const window = request.window || {
        startTime: SCHEDULE_SUGGESTIONS.START_TIME,
        endTime: SCHEDULE_SUGGESTIONS.END_TIME,
      };
      const start = minutes(session.startTime);
      const duration = minutes(session.endTime) - start;
      const suggestions: ScheduleSuggestion[] = [];
      const add = (room: Room, startMinutes: number, kind: ScheduleSuggestion['kind']) => {
        if (
          suggestions.length >= SCHEDULE_SUGGESTIONS.MAX_RESULTS ||
          room.capacity < selectedClass.max_capacity ||
          startMinutes < minutes(window.startTime) ||
          startMinutes + duration > minutes(window.endTime)
        )
          return;
        const candidate = {
          ...session,
          roomId: room.id,
          startTime: formatTime(startMinutes),
          endTime: formatTime(startMinutes + duration),
        };
        if (!blocked.some((slot) => overlaps(candidate, slot)))
          suggestions.push({ ...candidate, roomName: room.name, kind });
      };
      for (const room of rooms.rows) if (room.id !== session.roomId) add(room, start, 'room');
      const sameRoom = rooms.rows.find((room) => room.id === session.roomId)!;
      const times: number[] = [];
      for (
        let value = minutes(window.startTime);
        value + duration <= minutes(window.endTime);
        value += SCHEDULE_SUGGESTIONS.STEP_MINUTES
      )
        if (value !== start) times.push(value);
      times.sort((a, b) => Math.abs(a - start) - Math.abs(b - start) || a - b);
      for (const value of times) add(sameRoom, value, 'time');
      await client.query('COMMIT');
      return { suggestions, window, stepMinutes: SCHEDULE_SUGGESTIONS.STEP_MINUTES };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

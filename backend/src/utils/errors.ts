import { ERROR_CODES } from './constants';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: string;
  public readonly params?: Readonly<Record<string, string | number>>;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    params?: Record<string, string | number>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.params = params;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    errorCode: string = ERROR_CODES.VALIDATION_ERROR,
    params?: Record<string, string | number>
  ) {
    super(message, 400, errorCode, params);
  }
}

export interface ScheduleConflict {
  conflict_type: string;
  conflict_id?: string;
  detail?: string;
}

export class ScheduleConflictError extends AppError {
  constructor(
    public readonly conflicts: ScheduleConflict[],
    public readonly slot?: { date: string; startTime: string; endTime: string }
  ) {
    super('SCHEDULE_CONFLICT', 409, ERROR_CODES.SCHEDULE_CONFLICT);
  }
}

const scheduleConstraints = new Map([
  ['schedule_sessions_teacher_overlap', 'TEACHER_CONFLICT'],
  ['schedule_sessions_room_overlap', 'ROOM_CONFLICT'],
  ['schedule_sessions_class_overlap', 'CLASS_CONFLICT'],
]);

export function scheduleWriteError(error: unknown, slot?: ScheduleConflictError['slot']) {
  const dbError = error as { code?: string; constraint?: string } | null;
  const conflictType =
    dbError?.code === '23P01' && dbError.constraint
      ? scheduleConstraints.get(dbError.constraint)
      : undefined;
  return conflictType ? new ScheduleConflictError([{ conflict_type: conflictType }], slot) : error;
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Unauthorized',
    errorCode: string = ERROR_CODES.UNAUTHORIZED,
    params?: Record<string, string | number>
  ) {
    super(message, 401, errorCode, params);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', errorCode: string = ERROR_CODES.FORBIDDEN) {
    super(message, 403, errorCode);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message: string,
    errorCode: string = ERROR_CODES.RATE_LIMIT_EXCEEDED,
    params?: Record<string, string | number>
  ) {
    super(message, 429, errorCode, params);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', errorCode: string = ERROR_CODES.NOT_FOUND) {
    super(message, 404, errorCode);
  }
}

export class LimitExceededError extends AppError {
  constructor(
    message: string = 'Plan limit exceeded',
    errorCode: string = ERROR_CODES.LIMIT_EXCEEDED
  ) {
    super(message, 403, errorCode);
  }
}

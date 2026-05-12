import { ERROR_CODES } from './constants';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errorCode: string = ERROR_CODES.VALIDATION_ERROR) {
    super(message, 400, errorCode);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized', errorCode: string = ERROR_CODES.UNAUTHORIZED) {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', errorCode: string = ERROR_CODES.FORBIDDEN) {
    super(message, 403, errorCode);
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

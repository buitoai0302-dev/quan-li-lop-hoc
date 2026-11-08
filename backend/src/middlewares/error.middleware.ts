import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { AppError, ScheduleConflictError } from '../utils/errors';
import { ERROR_CODES } from '../utils/constants';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ScheduleConflictError) {
    return res.status(409).json({
      success: false,
      error: ERROR_CODES.SCHEDULE_CONFLICT,
      conflicts: err.conflicts,
      ...(err.slot && { slot: err.slot }),
    });
  }
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const response: any = {
    status: err.status,
    message: err.message,
    error: err.message, // Keep for backward compatibility with frontend toast.error(error.response.data.error)
    code: err.errorCode || ERROR_CODES.INTERNAL_ERROR,
  };

  if (err instanceof AppError && err.params) response.params = err.params;

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }

  if (!err.isOperational && process.env.NODE_ENV !== 'development') {
    logger.error(err, 'ERROR 💥');
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
      code: ERROR_CODES.INTERNAL_ERROR,
    });
  }

  res.status(err.statusCode).json(response);
};

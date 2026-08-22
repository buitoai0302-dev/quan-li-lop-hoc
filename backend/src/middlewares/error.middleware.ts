import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const response: any = {
    status: err.status,
    message: err.message,
    error: err.message, // Keep for backward compatibility with frontend toast.error(error.response.data.error)
    code: err.errorCode || 'INTERNAL_ERROR',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }

  if (!err.isOperational && process.env.NODE_ENV !== 'development') {
    logger.error(err, 'ERROR 💥');
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
      code: 'INTERNAL_ERROR',
    });
  }

  res.status(err.statusCode).json(response);
};

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';
import { ValidationError } from '../utils/errors';
import { ERROR_CODES } from '../utils/constants';

const ARRAY_LIMIT_MESSAGES = new Map<string, string>([
  [ERROR_CODES.CLASS_RECURRING_LIMIT_EXCEEDED, 'Too many recurring schedule entries'],
  [ERROR_CODES.CLASS_ENROLLMENT_LIMIT_EXCEEDED, 'Too many enrollment entries'],
]);

export const validate = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: unknown) {
      if (!(error instanceof ZodError) || !error.issues.length) {
        next(error);
        return;
      }
      const issue = error.issues[0];
      const limitMessage = ARRAY_LIMIT_MESSAGES.get(issue.message);
      if (
        issue.code === 'too_big' &&
        issue.origin === 'array' &&
        limitMessage &&
        typeof issue.maximum === 'number' &&
        Number.isSafeInteger(issue.maximum)
      ) {
        next(new ValidationError(limitMessage, issue.message, { limit: issue.maximum }));
        return;
      }
      next(new ValidationError(issue.message, ERROR_CODES.VALIDATION_ERROR));
    }
  };
};

// Relaxed UUID regex to allow all valid UUID formats, including manually created mock data (e.g. 11111111-0000-0000-0000-000000000001)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that specified route params are valid UUIDs.
 * Usage: validateUUID(['id', 'classId'])
 * Example: router.get('/:id', validateUUID(['id']), handler)
 */
export const validateUUID = (params: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const param of params) {
      const value = req.params[param];
      if (typeof value === 'string' && !UUID_REGEX.test(value)) {
        next(
          new ValidationError(
            `Invalid ID format for parameter '${param}'`,
            ERROR_CODES.INVALID_ID_FORMAT,
            { field: param }
          )
        );
        return;
      }
    }
    next();
  };
};

/**
 * Validates that specified request body fields are valid UUIDs.
 * Usage: validateBodyUUID(['classId', 'roomId', 'teacherId'])
 */
export const validateBodyUUID = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const field of fields) {
      const value = req.body[field];
      if (typeof value === 'string' && !UUID_REGEX.test(value)) {
        next(
          new ValidationError(
            `Invalid UUID format for field '${field}'`,
            ERROR_CODES.INVALID_ID_FORMAT,
            { field }
          )
        );
        return;
      }
    }
    next();
  };
};

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const validate = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      if (error && error.issues && error.issues.length > 0) {
        next(new ValidationError(error.issues[0].message, 'VALIDATION_ERROR'));
      } else if (error && error.errors && error.errors.length > 0) {
        next(new ValidationError(error.errors[0].message, 'VALIDATION_ERROR'));
      } else {
        next(error);
      }
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
          new ValidationError(`Invalid ID format for parameter '${param}'`, 'INVALID_ID_FORMAT')
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
        next(new ValidationError(`Invalid UUID format for field '${field}'`, 'INVALID_ID_FORMAT'));
        return;
      }
    }
    next();
  };
};

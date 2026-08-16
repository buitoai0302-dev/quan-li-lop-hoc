import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

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

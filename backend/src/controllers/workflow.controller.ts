import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { AuthenticationError } from '../utils/errors';
import { WorkItemsService } from '../services/work-items.service';
import { StudentProfileService } from '../services/student-profile.service';
import { workItemsQuerySchema, studentHistoryQuerySchema } from '../validators/workflow.validator';

export async function getWorkItems(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AuthenticationError();
    res.json(
      await WorkItemsService.getWorkItems(
        req.tenantId || req.user.tenantId,
        req.user,
        workItemsQuerySchema.parse(req.query)
      )
    );
  } catch (error) {
    next(error);
  }
}
export async function getStudentProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AuthenticationError();
    res.json(
      await StudentProfileService.getProfile(
        req.tenantId || req.user.tenantId,
        req.params.id as string,
        req.user.role
      )
    );
  } catch (error) {
    next(error);
  }
}
export async function getStudentHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AuthenticationError();
    res.json(
      await StudentProfileService.getHistory(
        req.tenantId || req.user.tenantId,
        req.params.id as string,
        req.user.role,
        studentHistoryQuerySchema.parse(req.query)
      )
    );
  } catch (error) {
    next(error);
  }
}

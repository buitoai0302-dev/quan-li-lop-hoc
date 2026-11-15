import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AttendanceService } from '../services/attendance.service';
import { AuthenticationError } from '../utils/errors';

export const getAttendanceBySession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const actor = req.user;
    if (!actor) throw new AuthenticationError();
    const tenantId = req.tenantId || actor.tenantId;
    const { sessionId } = req.params;

    const result = await AttendanceService.getAttendanceBySession(
      tenantId,
      sessionId as string,
      actor
    );

    if (!result.success) {
      return res.status(403).json(result);
    }

    res.json(result.data);
  } catch (error) {
    next(error);
  }
};

export const recordAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const actor = req.user;
    if (!actor) throw new AuthenticationError();
    const tenantId = req.tenantId || actor.tenantId;
    const { sessionId } = req.params;
    const { records } = req.body;

    const result = await AttendanceService.recordAttendance(
      tenantId,
      sessionId as string,
      records,
      actor
    );

    if (!result.success) {
      return res.status(result.error === 'SESSION_DATE_RESTRICTED' ? 400 : 403).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

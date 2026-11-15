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
    const { records, expectedVersion, reason, confirmedStudentIds } = req.body;

    const result = await AttendanceService.recordAttendance(
      tenantId,
      sessionId as string,
      records,
      actor,
      { expectedVersion, reason, confirmedStudentIds }
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const actor = req.user;
    if (!actor) throw new AuthenticationError();
    res.json(
      await AttendanceService.getHistory(
        req.tenantId || actor.tenantId,
        req.params.sessionId as string,
        actor,
        Number(req.query.offset || 0)
      )
    );
  } catch (error) {
    next(error);
  }
};

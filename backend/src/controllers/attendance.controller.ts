import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AttendanceService } from '../services/attendance.service';

export const getAttendanceBySession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { sessionId } = req.params;

    const result = await AttendanceService.getAttendanceBySession(
      tenantId as string,
      sessionId as string
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
    const tenantId = req.tenantId || req.user?.tenantId;
    const { sessionId } = req.params;
    const { records } = req.body;

    const result = await AttendanceService.recordAttendance(
      tenantId as string,
      sessionId as string,
      records
    );

    if (!result.success) {
      return res.status(result.error === 'SESSION_DATE_RESTRICTED' ? 400 : 403).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

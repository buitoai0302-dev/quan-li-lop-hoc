import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ValidationError } from '../utils/errors';
import { ScheduleService } from '../services/schedule.service';

export const getWeeklySchedule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { weekStart, startDate, endDate, branchId, teacherId, classId } = req.query;

    const queryStartDate = (startDate as string) || (weekStart as string);

    if (!queryStartDate) {
      throw new ValidationError('startDate or weekStart is required', 'MISSING_REQUIRED_FIELDS');
    }

    const userRole = req.user?.role;
    let userEmail = req.user?.email;

    let queryEndDate = endDate as string;
    if (!queryEndDate) {
      const tempDate = new Date(queryStartDate);
      if (isNaN(tempDate.getTime())) {
        throw new ValidationError('Invalid startDate or weekStart format', 'INVALID_DATE_FORMAT');
      }
      tempDate.setDate(tempDate.getDate() + 6);
      queryEndDate = tempDate.toISOString().split('T')[0];
    }

    const sessions = await ScheduleService.getWeeklySchedule(
      tenantId as string,
      {
        startDate: queryStartDate,
        endDate: queryEndDate,
        branchId: branchId as string,
        teacherId: teacherId as string,
        classId: classId as string,
      },
      userRole,
      userEmail
    );

    res.json({
      success: true,
      data: {
        startDate: queryStartDate,
        endDate: queryEndDate,
        sessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;

    const result = await ScheduleService.createSession(tenantId as string, userId, req.body);

    if (!result.success) {
      res.status(409).json({
        success: false,
        error: 'SCHEDULE_CONFLICT',
        conflicts: result.conflicts,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    const result = await ScheduleService.updateSession(
      tenantId as string,
      userId,
      id as string,
      req.body
    );

    if (!result.success) {
      res.status(409).json({
        success: false,
        error: 'SCHEDULE_CONFLICT',
        conflicts: result.conflicts,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    await ScheduleService.deleteSession(tenantId as string, userId, id as string);

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    next(error);
  }
};

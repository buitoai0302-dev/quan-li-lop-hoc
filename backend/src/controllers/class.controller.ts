import { logger } from '../utils/logger';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ClassService } from '../services/class.service';

export const getClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    const result = await ClassService.getClasses(tenantId as string, userRole, userEmail);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await ClassService.getClassById(tenantId as string, id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;

    const result = await ClassService.createClass(tenantId as string, req.body);
    res.status(201).json(result);
  } catch (error: any) {
    logger.error(error, 'CREATE CLASS ERROR:');
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};

export const getRecurringSchedules = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const result = await ClassService.getRecurringSchedules(id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await ClassService.updateClass(tenantId as string, id as string, req.body);
    res.json(result);
  } catch (error: any) {
    logger.error(error, 'UPDATE CLASS ERROR:');
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
      detail: error.detail || error.hint || null,
    });
  }
};

export const deleteClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    await ClassService.deleteClass(tenantId as string, id as string);
    res.json({ success: true, message: 'CLASS_DELETED_SUCCESS' });
  } catch (error) {
    next(error);
  }
};

export const getEnrollments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await ClassService.getEnrollments(tenantId as string, id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const enrollStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { student_id, student_ids } = req.body;

    const results = await ClassService.enrollStudent(
      tenantId as string,
      id as string,
      student_id,
      student_ids
    );
    res.status(201).json({ success: true, count: results.length });
  } catch (error) {
    next(error);
  }
};

export const unenrollStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id, studentId } = req.params;

    await ClassService.unenrollStudent(tenantId as string, id as string, studentId as string);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

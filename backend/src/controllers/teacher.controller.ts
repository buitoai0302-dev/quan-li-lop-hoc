import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { TeacherService } from '../services/teacher.service';

export const getTeachers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const teachers = await TeacherService.getTeachers(tenantId as string);
    res.json(teachers);
  } catch (error) {
    next(error);
  }
};

export const createTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const teacher = await TeacherService.createTeacher(tenantId as string, req.body);
    res.status(201).json(teacher);
  } catch (error) {
    next(error);
  }
};

export const updateTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const teacher = await TeacherService.updateTeacher(tenantId as string, id as string, req.body);
    res.json(teacher);
  } catch (error) {
    next(error);
  }
};

export const deleteTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    await TeacherService.deleteTeacher(tenantId as string, id as string);
    res.json({ success: true, message: 'TEACHER_DELETED_SUCCESS' });
  } catch (error) {
    next(error);
  }
};

export const resetTeacherPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const result = await TeacherService.resetPassword(
      tenantId as string,
      id as string,
      req.body.password
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

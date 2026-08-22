import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { StudentService } from '../services/student.service';
import { ValidationError } from '../utils/errors';

export const getStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await StudentService.getStudents(tenantId as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await StudentService.createStudent(tenantId as string, req.body);
    res.status(201).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const updateStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const result = await StudentService.updateStudent(tenantId as string, id as string, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    await StudentService.deleteStudent(tenantId as string, id as string);
    res.json({ success: true, message: 'Học sinh đã được xóa thành công' });
  } catch (error) {
    next(error);
  }
};

export const bulkImport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await StudentService.bulkImport(tenantId as string, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

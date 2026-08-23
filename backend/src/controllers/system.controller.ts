import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SystemService } from '../services/system.service';

export const getPublicSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await SystemService.getPublicSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const getAdminSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await SystemService.getAdminSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await SystemService.updateSettings(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

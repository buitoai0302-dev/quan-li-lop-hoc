import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { DashboardService } from '../services/dashboard.service';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const role = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    const result = await DashboardService.getDashboardStats(
      tenantId as string,
      role,
      userId,
      req.headers,
      req.query
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getActivities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const role = req.user?.role;
    const userId = (req as any).user?.userId;
    const userEmail = req.user?.email;

    const result = await DashboardService.getActivities(
      tenantId as string,
      role,
      userId,
      userEmail,
      req.query
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

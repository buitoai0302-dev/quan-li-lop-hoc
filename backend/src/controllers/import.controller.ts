import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { ImportService } from '../services/import.service';

export const importData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ImportService.importData(
      (req.tenantId || req.user?.tenantId) as string,
      String(req.params.type),
      req.body.data
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

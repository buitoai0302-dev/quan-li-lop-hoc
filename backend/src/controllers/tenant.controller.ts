import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { TenantService } from '../services/tenant.service';
import { AuthenticationError } from '../utils/errors';

export const getApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new AuthenticationError();

    const result = await TenantService.getApiKey(tenantId as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const generateApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new AuthenticationError();

    const result = await TenantService.generateApiKey(tenantId as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new AuthenticationError();

    const result = await TenantService.getTenant(tenantId as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new AuthenticationError();

    const result = await TenantService.updateTenant(tenantId as string, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

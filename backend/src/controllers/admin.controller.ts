import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AdminService } from '../services/admin.service';

export const getSystemStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await AdminService.getSystemStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getAllTenants = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenants = await AdminService.getAllTenants();
    res.json(tenants);
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AdminService.updateTenant(req.params.id as string, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plans = await AdminService.getPlans();
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

export const updatePlanDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AdminService.updatePlanDetails(req.params.id as string, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await AdminService.getAllUsers(req.query);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AdminService.createUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AdminService.resetUserPassword(req.params.id as string, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AdminService.toggleUserStatus(req.params.id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const importUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tenant_id, data } = req.body;
    const result = await AdminService.importUsers(tenant_id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

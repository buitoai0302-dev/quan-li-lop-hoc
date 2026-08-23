import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { BranchService } from '../services/branch.service';

export const getBranches = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const branches = await BranchService.getBranches(tenantId as string);
    res.json(branches);
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const branch = await BranchService.createBranch(tenantId as string, req.body);
    res.status(201).json(branch);
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const branch = await BranchService.updateBranch(tenantId as string, id as string, req.body);
    res.json(branch);
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    await BranchService.deleteBranch(tenantId as string, id as string);
    res.json({ success: true, message: 'BRANCH_DELETED_SUCCESS' });
  } catch (error) {
    next(error);
  }
};

export const updateFirstBranch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const branch = await BranchService.updateFirstBranch(tenantId as string, req.body);
    res.json(branch);
  } catch (error) {
    next(error);
  }
};

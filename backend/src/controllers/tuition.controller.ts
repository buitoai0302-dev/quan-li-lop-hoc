import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { TuitionService } from '../services/tuition.service';

// ─── GET /api/tuitions ─────────────────────────────────────────────────────
// Lấy danh sách học phí có filter: status, class_id, billing_period, student_id
export const getTuitions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await TuitionService.getTuitions(tenantId as string, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/tuitions/overdue ──────────────────────────────────────────────
// Danh sách học phí quá hạn chưa đóng
export const getOverdueTuitions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await TuitionService.getOverdueTuitions(tenantId as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/tuitions ────────────────────────────────────────────────────
// Tạo 1 khoản học phí cho 1 học sinh
export const createTuition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;

    const result = await TuitionService.createTuition(
      tenantId as string,
      userId as string,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/tuitions/bulk-generate ──────────────────────────────────────
// Tạo học phí hàng loạt cho toàn bộ học sinh trong 1 lớp
export const bulkGenerateTuitions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;

    const result = await TuitionService.bulkGenerateTuitions(
      tenantId as string,
      userId as string,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/tuitions/:id ────────────────────────────────────────────────
export const updateTuition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await TuitionService.updateTuition(tenantId as string, id as string, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/tuitions/:id ───────────────────────────────────────────────
export const deleteTuition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    await TuitionService.deleteTuition(tenantId as string, id as string);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/tuitions/:id/payments ────────────────────────────────────────
export const getTuitionPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await TuitionService.getTuitionPayments(tenantId as string, id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/tuitions/:id/payments ───────────────────────────────────────
// Ghi nhận 1 lần thanh toán cho khoản học phí
export const recordPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    const { id } = req.params;

    const result = await TuitionService.recordPayment(
      tenantId as string,
      userId as string,
      id as string,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

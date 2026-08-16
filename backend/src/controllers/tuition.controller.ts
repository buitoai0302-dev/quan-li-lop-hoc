import { Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ValidationError } from '../utils/errors';

// ─── GET /api/tuitions ─────────────────────────────────────────────────────
// Lấy danh sách học phí có filter: status, class_id, billing_period, student_id
export const getTuitions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { status, class_id, billing_period, student_id, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        t.*,
        s.full_name AS student_name,
        s.phone AS student_phone,
        s.parent_phone,
        c.name AS class_name
      FROM tuitions t
      JOIN students s ON t.student_id = s.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE t.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let idx = 2;

    if (status) {
      query += ` AND t.status = $${idx++}`;
      params.push(status);
    }
    if (class_id) {
      query += ` AND t.class_id = $${idx++}`;
      params.push(class_id);
    }
    if (billing_period) {
      query += ` AND t.billing_period = $${idx++}`;
      params.push(billing_period);
    }
    if (student_id) {
      query += ` AND t.student_id = $${idx++}`;
      params.push(student_id);
    }

    query += ` ORDER BY t.due_date DESC, s.full_name ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    // Tổng kết tài chính
    const summaryResult = await pool.query(
      `SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(amount_due), 0) AS total_amount_due,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(amount_due - amount_paid), 0) AS total_outstanding
      FROM tuitions
      WHERE tenant_id = $1
        ${status ? `AND status = '${status}'` : ''}
        ${class_id ? `AND class_id = '${class_id}'` : ''}
        ${billing_period ? `AND billing_period = '${billing_period}'` : ''}
      `,
      [tenantId]
    );

    res.json({
      data: result.rows,
      summary: summaryResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/tuitions/overdue ──────────────────────────────────────────────
// Danh sách học phí quá hạn chưa đóng
export const getOverdueTuitions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;

    const result = await pool.query(
      `SELECT 
        t.*,
        s.full_name AS student_name,
        s.phone AS student_phone,
        s.parent_phone,
        c.name AS class_name,
        (CURRENT_DATE - t.due_date) AS days_overdue
      FROM tuitions t
      JOIN students s ON t.student_id = s.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE t.tenant_id = $1
        AND t.status IN ('unpaid', 'partial')
        AND t.due_date < CURRENT_DATE
      ORDER BY days_overdue DESC`,
      [tenantId]
    );

    // Tự động cập nhật trạng thái overdue
    await pool.query(
      `UPDATE tuitions SET status = 'overdue', updated_at = NOW()
       WHERE tenant_id = $1 AND status IN ('unpaid', 'partial') AND due_date < CURRENT_DATE`,
      [tenantId]
    );

    res.json(result.rows);
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
    const {
      student_id,
      class_id,
      amount,
      discount = 0,
      due_date,
      billing_cycle = 'monthly',
      billing_period,
      notes,
    } = req.body;

    if (!student_id || !amount || !due_date) {
      throw new ValidationError(
        'Vui lòng điền học sinh, số tiền và ngày đến hạn',
        'MISSING_REQUIRED_FIELDS'
      );
    }

    const result = await pool.query(
      `INSERT INTO tuitions (tenant_id, student_id, class_id, amount, discount, due_date, billing_cycle, billing_period, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId,
        student_id,
        class_id || null,
        amount,
        discount,
        due_date,
        billing_cycle,
        billing_period || null,
        notes || null,
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/tuitions/bulk-generate ──────────────────────────────────────
// Tạo học phí hàng loạt cho toàn bộ học sinh trong 1 lớp
export const bulkGenerateTuitions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.userId;
    const {
      class_id,
      amount,
      discount = 0,
      due_date,
      billing_period,
      billing_cycle = 'monthly',
      notes,
      skip_existing = true,
    } = req.body;

    if (!class_id || !amount || !due_date || !billing_period) {
      throw new ValidationError(
        'Thiếu thông tin lớp học, số tiền, ngày đến hạn hoặc kỳ học phí',
        'MISSING_REQUIRED_FIELDS'
      );
    }

    await client.query('BEGIN');

    // Lấy tất cả học sinh trong lớp
    const studentsResult = await client.query(
      `SELECT s.id, s.full_name FROM students s
       JOIN class_students cs ON s.id = cs.student_id
       WHERE cs.class_id = $1 AND s.tenant_id = $2 AND s.is_deleted = false AND s.is_active = true`,
      [class_id, tenantId]
    );

    if (studentsResult.rows.length === 0) {
      throw new ValidationError(
        'Lớp học không có học sinh hoặc không tìm thấy',
        'NO_STUDENTS_FOUND'
      );
    }

    let created = 0;
    let skipped = 0;
    const tuitions = [];

    for (const student of studentsResult.rows) {
      // Kiểm tra đã tạo cho kỳ này chưa
      if (skip_existing) {
        const existing = await client.query(
          `SELECT id FROM tuitions WHERE tenant_id = $1 AND student_id = $2 AND class_id = $3 AND billing_period = $4`,
          [tenantId, student.id, class_id, billing_period]
        );
        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }
      }

      const insertResult = await client.query(
        `INSERT INTO tuitions (tenant_id, student_id, class_id, amount, discount, due_date, billing_cycle, billing_period, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          tenantId,
          student.id,
          class_id,
          amount,
          discount,
          due_date,
          billing_cycle,
          billing_period,
          notes || null,
          userId,
        ]
      );
      tuitions.push(insertResult.rows[0]);
      created++;
    }

    await client.query('COMMIT');
    res.status(201).json({ created, skipped, tuitions });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ─── PATCH /api/tuitions/:id ────────────────────────────────────────────────
export const updateTuition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { amount, discount, due_date, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE tuitions SET
         amount = COALESCE($1, amount),
         discount = COALESCE($2, discount),
         due_date = COALESCE($3, due_date),
         status = COALESCE($4, status),
         notes = COALESCE($5, notes),
         updated_at = NOW()
       WHERE id = $6 AND tenant_id = $7
       RETURNING *`,
      [amount, discount, due_date, status, notes, id, tenantId]
    );

    if (result.rows.length === 0)
      throw new NotFoundError('Không tìm thấy học phí', 'TUITION_NOT_FOUND');
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/tuitions/:id ───────────────────────────────────────────────
export const deleteTuition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    // Chỉ xóa được nếu chưa có thanh toán nào
    const paymentCheck = await pool.query(`SELECT COUNT(*) FROM payments WHERE tuition_id = $1`, [
      id,
    ]);
    if (parseInt(paymentCheck.rows[0].count) > 0) {
      throw new ValidationError('Không thể xóa học phí đã có lịch sử thanh toán', 'HAS_PAYMENTS');
    }

    const result = await pool.query(
      `DELETE FROM tuitions WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    if (result.rows.length === 0)
      throw new NotFoundError('Không tìm thấy học phí', 'TUITION_NOT_FOUND');
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

    const result = await pool.query(
      `SELECT p.*, u.full_name AS received_by_name
       FROM payments p
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.tuition_id = $1 AND p.tenant_id = $2
       ORDER BY p.payment_date DESC`,
      [id, tenantId]
    );

    res.json(result.rows);
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
    const { amount_paid, payment_date, payment_method = 'cash', reference_code, notes } = req.body;

    if (!amount_paid || Number(amount_paid) <= 0) {
      throw new ValidationError('Số tiền thanh toán phải lớn hơn 0', 'INVALID_AMOUNT');
    }

    // Kiểm tra tuition tồn tại
    const tuitionResult = await pool.query(
      `SELECT * FROM tuitions WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (tuitionResult.rows.length === 0)
      throw new NotFoundError('Không tìm thấy học phí', 'TUITION_NOT_FOUND');

    const tuition = tuitionResult.rows[0];
    if (tuition.status === 'paid') {
      throw new ValidationError('Học phí này đã được thanh toán đầy đủ', 'ALREADY_PAID');
    }

    const result = await pool.query(
      `INSERT INTO payments (tenant_id, tuition_id, amount_paid, payment_date, payment_method, reference_code, notes, received_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        tenantId,
        id,
        amount_paid,
        payment_date || new Date().toISOString().split('T')[0],
        payment_method,
        reference_code || null,
        notes || null,
        userId,
      ]
    );

    // Lấy lại tuition đã được trigger cập nhật
    const updatedTuition = await pool.query(`SELECT * FROM tuitions WHERE id = $1`, [id]);

    res.status(201).json({
      payment: result.rows[0],
      tuition: updatedTuition.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

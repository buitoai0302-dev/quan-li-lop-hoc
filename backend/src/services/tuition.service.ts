import pool from '../db';
import { NotFoundError, ValidationError } from '../utils/errors';

export class TuitionService {
  static async getTuitions(tenantId: string, filters: any) {
    const { status, class_id, billing_period, student_id, limit = 100, offset = 0 } = filters;

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
    const summaryParams: any[] = [tenantId];
    let summaryWhere = '';
    if (status) {
      summaryWhere += ` AND status = $${summaryParams.push(status)}`;
    }
    if (class_id) {
      summaryWhere += ` AND class_id = $${summaryParams.push(class_id)}`;
    }
    if (billing_period) {
      summaryWhere += ` AND billing_period = $${summaryParams.push(billing_period)}`;
    }

    const summaryResult = await pool.query(
      `SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(amount_due), 0) AS total_amount_due,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(amount_due - amount_paid), 0) AS total_outstanding
      FROM tuitions
      WHERE tenant_id = $1${summaryWhere}`,
      summaryParams
    );

    return {
      data: result.rows,
      summary: summaryResult.rows[0],
    };
  }

  static async getOverdueTuitions(tenantId: string) {
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

    return result.rows;
  }

  static async createTuition(tenantId: string, userId: string, data: any) {
    const {
      student_id,
      class_id,
      amount,
      discount = 0,
      due_date,
      billing_cycle = 'monthly',
      billing_period,
      notes,
    } = data;

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

    return result.rows[0];
  }

  static async bulkGenerateTuitions(tenantId: string, userId: string, data: any) {
    const client = await pool.connect();
    try {
      const {
        class_id,
        amount,
        discount = 0,
        due_date,
        billing_period,
        billing_cycle = 'monthly',
        notes,
        skip_existing = true,
      } = data;

      if (!class_id || !amount || !due_date || !billing_period) {
        throw new ValidationError(
          'Thiếu thông tin lớp học, số tiền, ngày đến hạn hoặc kỳ học phí',
          'MISSING_REQUIRED_FIELDS'
        );
      }

      await client.query('BEGIN');

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
      return { created, skipped, tuitions };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateTuition(tenantId: string, id: string, data: any) {
    const { amount, discount, due_date, status, notes } = data;

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
    return result.rows[0];
  }

  static async deleteTuition(tenantId: string, id: string) {
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

    return true;
  }

  static async getTuitionPayments(tenantId: string, tuitionId: string) {
    const result = await pool.query(
      `SELECT p.*, u.full_name AS received_by_name
       FROM payments p
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.tuition_id = $1 AND p.tenant_id = $2
       ORDER BY p.payment_date DESC`,
      [tuitionId, tenantId]
    );
    return result.rows;
  }

  static async recordPayment(tenantId: string, userId: string, tuitionId: string, data: any) {
    const { amount_paid, payment_date, payment_method = 'cash', reference_code, notes } = data;

    if (!amount_paid || Number(amount_paid) <= 0) {
      throw new ValidationError('Số tiền thanh toán phải lớn hơn 0', 'INVALID_AMOUNT');
    }

    const tuitionResult = await pool.query(
      `SELECT * FROM tuitions WHERE id = $1 AND tenant_id = $2`,
      [tuitionId, tenantId]
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
        tuitionId,
        amount_paid,
        payment_date || new Date().toISOString().split('T')[0],
        payment_method,
        reference_code || null,
        notes || null,
        userId,
      ]
    );

    const updatedTuition = await pool.query(`SELECT * FROM tuitions WHERE id = $1`, [tuitionId]);

    return {
      payment: result.rows[0],
      tuition: updatedTuition.rows[0],
    };
  }
}

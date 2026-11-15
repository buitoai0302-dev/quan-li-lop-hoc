import { ERROR_CODES, TUITION_STATUS, VIETNAM_TIME_ZONE } from '../utils/constants';
import type { PoolClient } from 'pg';
import pool from '../db';
import { NotFoundError, ValidationError } from '../utils/errors';
import { assertTenantReferences } from './tenant-reference.service';
import {
  TuitionFilters,
  CreateTuitionDto,
  BulkGenerateTuitionDto,
  RecordPaymentDto,
} from '../types';
import type { UpdateTuitionDto } from '../validators/tuition.validator';

async function lockTuition(client: PoolClient, tenantId: string, tuitionId: string) {
  const result = await client.query(
    'SELECT id FROM tuitions WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
    [tenantId, tuitionId]
  );
  if (!result.rows.length) {
    throw new NotFoundError('Tuition not found', ERROR_CODES.TUITION_NOT_FOUND);
  }
}

export class TuitionService {
  static async getTuitions(tenantId: string, filters: TuitionFilters) {
    const { status, class_id, billing_period, student_id, limit = 100, offset = 0 } = filters;

    const effectiveStatus = `CASE WHEN t.status = ANY($4::text[])
      AND t.amount_due > t.amount_paid
      AND t.due_date < (CURRENT_TIMESTAMP AT TIME ZONE $2)::date
      THEN $3::text ELSE t.status END`;
    const baseParams = [
      tenantId,
      VIETNAM_TIME_ZONE,
      TUITION_STATUS.OVERDUE,
      [TUITION_STATUS.UNPAID, TUITION_STATUS.PARTIAL, TUITION_STATUS.OVERDUE],
    ];

    let query = `
      SELECT 
        t.*, ${effectiveStatus} AS status,
        s.full_name AS student_name,
        s.phone AS student_phone,
        s.parent_phone,
        c.name AS class_name
      FROM tuitions t
      JOIN students s ON t.student_id = s.id AND s.tenant_id = t.tenant_id
      LEFT JOIN classes c ON t.class_id = c.id AND c.tenant_id = t.tenant_id
      WHERE t.tenant_id = $1
    `;
    const params: unknown[] = [...baseParams];
    let idx = params.length + 1;

    if (status) {
      query += ` AND (${effectiveStatus}) = $${idx++}`;
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
    const summaryParams: unknown[] = [...baseParams];
    let summaryWhere = '';
    if (status) {
      summaryWhere += ` AND t.status = $${summaryParams.push(status)}`;
    }
    if (class_id) {
      summaryWhere += ` AND class_id = $${summaryParams.push(class_id)}`;
    }
    if (billing_period) {
      summaryWhere += ` AND billing_period = $${summaryParams.push(billing_period)}`;
    }
    if (student_id) {
      summaryWhere += ` AND student_id = $${summaryParams.push(student_id)}`;
    }

    const summaryResult = await pool.query(
      `WITH tenant_tuitions AS (
        SELECT t.amount_due, t.amount_paid, t.class_id, t.billing_period, t.student_id,
               ${effectiveStatus} AS status
        FROM tuitions t
        WHERE t.tenant_id = $1
      )
      SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(amount_due), 0) AS total_amount_due,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(amount_due - amount_paid), 0) AS total_outstanding
      FROM tenant_tuitions t
      WHERE true${summaryWhere}`,
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
        t.*, $2::text AS status,
        s.full_name AS student_name,
        s.phone AS student_phone,
        s.parent_phone,
        c.name AS class_name,
        ((CURRENT_TIMESTAMP AT TIME ZONE $3)::date - t.due_date) AS days_overdue
      FROM tuitions t
      JOIN students s ON t.student_id = s.id AND s.tenant_id = t.tenant_id
      LEFT JOIN classes c ON t.class_id = c.id AND c.tenant_id = t.tenant_id
      WHERE t.tenant_id = $1
        AND t.status = ANY($4::text[])
        AND t.amount_due > t.amount_paid
        AND t.due_date < (CURRENT_TIMESTAMP AT TIME ZONE $3)::date
      ORDER BY days_overdue DESC`,
      [
        tenantId,
        TUITION_STATUS.OVERDUE,
        VIETNAM_TIME_ZONE,
        [TUITION_STATUS.UNPAID, TUITION_STATUS.PARTIAL, TUITION_STATUS.OVERDUE],
      ]
    );

    return result.rows;
  }

  static async createTuition(tenantId: string, userId: string, data: CreateTuitionDto) {
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
      throw new ValidationError('MISSING_REQUIRED_FIELDS', ERROR_CODES.MISSING_REQUIRED_FIELDS);
    }

    await assertTenantReferences(pool, tenantId, 'students', [student_id]);
    await assertTenantReferences(pool, tenantId, 'classes', [class_id]);

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

  static async bulkGenerateTuitions(
    tenantId: string,
    userId: string,
    data: BulkGenerateTuitionDto
  ) {
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
        throw new ValidationError('MISSING_REQUIRED_FIELDS', ERROR_CODES.MISSING_REQUIRED_FIELDS);
      }

      await client.query('BEGIN');

      // Serialize generation for this class, including the existence check below.
      const target = await client.query(
        'SELECT id FROM classes WHERE tenant_id = $1 AND id = $2 AND is_deleted = false FOR NO KEY UPDATE',
        [tenantId, class_id]
      );
      if (!target.rows.length) {
        throw new NotFoundError('Class not found', ERROR_CODES.CLASS_NOT_FOUND);
      }

      const studentsResult = await client.query(
        `SELECT s.id, s.full_name FROM students s
         JOIN class_students cs ON s.id = cs.student_id AND s.tenant_id = cs.tenant_id
         WHERE cs.class_id = $1 AND s.tenant_id = $2 AND s.is_deleted = false AND s.is_active = true`,
        [class_id, tenantId]
      );

      if (studentsResult.rows.length === 0) {
        throw new ValidationError('NO_STUDENTS_FOUND', ERROR_CODES.NO_STUDENTS_FOUND);
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

  static async updateTuition(tenantId: string, id: string, data: UpdateTuitionDto) {
    const { amount, discount, due_date, status, notes } = data;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockTuition(client, tenantId, id);
      const {
        rows: [balance],
      } = await client.query<{
        below_paid: boolean;
        settled: boolean;
        has_payment: boolean;
        overdue: boolean;
        status: string;
      }>(
        `SELECT candidate.new_amount_due < amount_paid AS below_paid,
                candidate.new_amount_due = amount_paid AS settled,
                amount_paid > 0 AS has_payment,
                COALESCE($5::date, due_date) < (CURRENT_TIMESTAMP AT TIME ZONE $6)::date AS overdue,
                status
         FROM tuitions
         CROSS JOIN LATERAL (
           SELECT COALESCE($3::numeric(15,2), amount) - COALESCE($4::numeric(15,2), discount) AS new_amount_due
         ) candidate
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, id, amount, discount, due_date, VIETNAM_TIME_ZONE]
      );
      if (balance.below_paid) {
        throw new ValidationError(
          'The amount due cannot be less than the amount already paid',
          ERROR_CODES.TUITION_DUE_BELOW_PAID
        );
      }

      const requestedWaiver = (status ?? balance.status) === TUITION_STATUS.WAIVED;
      let nextStatus: string;
      if (requestedWaiver && (!balance.settled || !balance.has_payment)) {
        nextStatus = TUITION_STATUS.WAIVED;
      } else if (balance.settled) {
        nextStatus = TUITION_STATUS.PAID;
      } else if (balance.overdue) {
        nextStatus = TUITION_STATUS.OVERDUE;
      } else {
        nextStatus = balance.has_payment ? TUITION_STATUS.PARTIAL : TUITION_STATUS.UNPAID;
      }
      if (status != null && status !== nextStatus) {
        throw new ValidationError(
          'The tuition status must match the balance and due date',
          ERROR_CODES.TUITION_STATUS_MISMATCH
        );
      }

      const result = await client.query(
        `UPDATE tuitions SET
           amount = COALESCE($3, amount),
           discount = COALESCE($4, discount),
           due_date = COALESCE($5, due_date),
           status = $6,
           notes = COALESCE($7, notes),
           updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2
         RETURNING *`,
        [tenantId, id, amount, discount, due_date, nextStatus, notes]
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteTuition(tenantId: string, id: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockTuition(client, tenantId, id);
      const paymentCheck = await client.query(
        'SELECT 1 FROM payments WHERE tenant_id = $1 AND tuition_id = $2 LIMIT 1',
        [tenantId, id]
      );
      if (paymentCheck.rows.length) {
        throw new ValidationError(
          'Cannot delete tuition with payment history',
          ERROR_CODES.HAS_PAYMENTS
        );
      }
      await client.query('DELETE FROM tuitions WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTuitionPayments(tenantId: string, tuitionId: string) {
    const result = await pool.query(
      `SELECT p.*, u.full_name AS received_by_name
       FROM payments p
       LEFT JOIN users u ON p.received_by = u.id AND u.tenant_id = p.tenant_id
       WHERE p.tuition_id = $1 AND p.tenant_id = $2
       ORDER BY p.payment_date DESC`,
      [tuitionId, tenantId]
    );
    return result.rows;
  }

  static async recordPayment(
    tenantId: string,
    userId: string,
    tuitionId: string,
    data: RecordPaymentDto
  ) {
    const { amount_paid, payment_date, payment_method = 'cash', reference_code, notes } = data;

    const amount = Number(amount_paid);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('INVALID_AMOUNT', ERROR_CODES.INVALID_AMOUNT);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tuitionResult = await client.query(
        `SELECT status, amount_paid >= amount_due AS settled,
                round($3::numeric, 2) AS payment_amount,
                round($3::numeric, 2) > 0 AS positive,
                round($3::numeric, 2) > amount_due - amount_paid AS exceeds_balance
         FROM tuitions WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [tuitionId, tenantId, amount]
      );
      const tuition = tuitionResult.rows[0];
      if (!tuition) throw new NotFoundError('TUITION_NOT_FOUND', ERROR_CODES.TUITION_NOT_FOUND);
      if (tuition.status === TUITION_STATUS.WAIVED) {
        throw new ValidationError('This tuition has been waived', ERROR_CODES.TUITION_WAIVED);
      }
      if (tuition.settled) {
        throw new ValidationError('ALREADY_PAID', ERROR_CODES.ALREADY_PAID);
      }
      if (!tuition.positive) {
        throw new ValidationError('INVALID_AMOUNT', ERROR_CODES.INVALID_AMOUNT);
      }
      if (tuition.exceeds_balance) {
        throw new ValidationError('PAYMENT_EXCEEDS_BALANCE', ERROR_CODES.PAYMENT_EXCEEDS_BALANCE);
      }

      const result = await client.query(
        `INSERT INTO payments (tenant_id, tuition_id, amount_paid, payment_date, payment_method, reference_code, notes, received_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          tenantId,
          tuitionId,
          tuition.payment_amount,
          payment_date || new Date().toISOString().split('T')[0],
          payment_method,
          reference_code || null,
          notes || null,
          userId,
        ]
      );
      const updatedTuition = await client.query(
        'SELECT * FROM tuitions WHERE id = $1 AND tenant_id = $2',
        [tuitionId, tenantId]
      );
      await client.query('COMMIT');
      return { payment: result.rows[0], tuition: updatedTuition.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendTeacherWelcomeEmail } from '../services/email.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { checkPlanLimit } from '../utils/limitChecker';
import { NotFoundError, ValidationError } from '../utils/errors';
import { FeatureFlagService } from '../services/feature-flag.service';

export const getTeachers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    const result = await pool.query(
      `SELECT t.*, b.name as branch_name 
       FROM teachers t
       LEFT JOIN branches b ON t.branch_id = b.id
       WHERE t.tenant_id = $1 AND t.is_deleted = false
       ORDER BY t.created_at DESC`,
      [tenantId]
    );

    const limit = await FeatureFlagService.checkLimit(tenantId as string, 'max_teachers');
    if (limit > 0) {
      return res.json(result.rows.slice(0, limit));
    }

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { full_name, email, phone, specialization, branch_id } = req.body;

    if (!full_name || !email || !branch_id) {
      throw new ValidationError('Vui lòng điền đầy đủ thông tin bắt buộc', 'MISSING_REQUIRED_FIELDS');
    }

    // Check Plan Limit
    await checkPlanLimit(tenantId as string, 'max_teachers', 'teachers', 'Bạn đã đạt giới hạn tối đa số lượng nhân sự/giáo viên.');

    await client.query('BEGIN');

    // 1. Create Teacher record
    const teacherResult = await client.query(
      `INSERT INTO teachers (tenant_id, branch_id, full_name, email, phone, specialization) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, branch_id, full_name, email, phone, specialization]
    );
    const teacher = teacherResult.rows[0];

    // 2. Create User account for the teacher
    const defaultPassword = email.split('@')[0];
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);
    const verificationToken = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length === 0) {
      await client.query(
        `INSERT INTO users (tenant_id, branch_id, email, password_hash, full_name, role, is_email_verified, verification_token, verification_token_expires, onboarding_completed) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [tenantId, branch_id, email, passwordHash, full_name, 'teacher', false, verificationToken, tokenExpires, true]
      );
    }

    await client.query('COMMIT');

    // Send welcome email (outside transaction)
    if (existingUser.rows.length === 0) {
      await sendTeacherWelcomeEmail(email, verificationToken, full_name);
    }

    res.status(201).json(teacher);
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return next(new ValidationError('Email này đã tồn tại trong hệ thống', 'EMAIL_ALREADY_EXISTS'));
    }
    next(error);
  } finally {
    client.release();
  }
};

export const updateTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { full_name, phone, specialization, branch_id, is_active } = req.body;

    const result = await pool.query(
      `UPDATE teachers 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           specialization = COALESCE($3, specialization),
           branch_id = COALESCE($4, branch_id),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [full_name, phone, specialization, branch_id, is_active, id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy nhân sự', 'TEACHER_NOT_FOUND');
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE teachers SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy nhân sự', 'TEACHER_NOT_FOUND');
    }

    res.json({ success: true, message: 'Nhân sự đã được xóa thành công' });
  } catch (error) {
    next(error);
  }
};

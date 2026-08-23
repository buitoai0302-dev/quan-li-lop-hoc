import pool from '../db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { NotFoundError, ValidationError } from '../utils/errors';
import { checkPlanLimit } from '../utils/limitChecker';
import { FeatureFlagService } from './feature-flag.service';
import { sendTeacherWelcomeEmail } from './email.service';

export interface CreateTeacherDTO {
  full_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  branch_id: string;
}

export interface UpdateTeacherDTO {
  full_name?: string;
  phone?: string;
  specialization?: string;
  branch_id?: string;
  is_active?: boolean;
}

export class TeacherService {
  static async getTeachers(tenantId: string) {
    const result = await pool.query(
      `SELECT t.*, b.name as branch_name 
       FROM teachers t
       LEFT JOIN branches b ON t.branch_id = b.id
       WHERE t.tenant_id = $1 AND t.is_deleted = false
       ORDER BY t.created_at DESC`,
      [tenantId]
    );

    const limit = await FeatureFlagService.checkLimit(tenantId, 'max_teachers');
    if (limit > 0) {
      return result.rows.slice(0, limit);
    }

    return result.rows;
  }

  static async createTeacher(tenantId: string, data: CreateTeacherDTO) {
    if (!data.full_name || !data.email || !data.branch_id) {
      throw new ValidationError(
        'Vui lòng điền đầy đủ thông tin bắt buộc',
        'MISSING_REQUIRED_FIELDS'
      );
    }

    await checkPlanLimit(
      tenantId,
      'max_teachers',
      'teachers',
      'Bạn đã đạt giới hạn tối đa số lượng nhân sự/giáo viên.'
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const teacherResult = await client.query(
        `INSERT INTO teachers (tenant_id, branch_id, full_name, email, phone, specialization) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [tenantId, data.branch_id, data.full_name, data.email, data.phone, data.specialization]
      );
      const teacher = teacherResult.rows[0];

      const defaultPassword = data.email.split('@')[0];
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);
      const verificationToken = crypto.randomUUID();
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [
        data.email,
      ]);

      if (existingUser.rows.length === 0) {
        await client.query(
          `INSERT INTO users (tenant_id, branch_id, email, password_hash, full_name, role, is_email_verified, verification_token, verification_token_expires, onboarding_completed) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            tenantId,
            data.branch_id,
            data.email,
            passwordHash,
            data.full_name,
            'teacher',
            false,
            verificationToken,
            tokenExpires,
            true,
          ]
        );
      }

      await client.query('COMMIT');

      if (existingUser.rows.length === 0) {
        await sendTeacherWelcomeEmail(data.email, verificationToken, data.full_name);
      }

      return teacher;
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        throw new ValidationError('Email này đã tồn tại trong hệ thống', 'EMAIL_ALREADY_EXISTS');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateTeacher(tenantId: string, teacherId: string, data: UpdateTeacherDTO) {
    const result = await pool.query(
      `UPDATE teachers 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           specialization = COALESCE($3, specialization),
           branch_id = COALESCE($4, branch_id),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [
        data.full_name,
        data.phone,
        data.specialization,
        data.branch_id,
        data.is_active,
        teacherId,
        tenantId,
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy nhân sự', 'TEACHER_NOT_FOUND');
    }

    return result.rows[0];
  }

  static async deleteTeacher(tenantId: string, teacherId: string) {
    const result = await pool.query(
      `UPDATE teachers SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [teacherId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy nhân sự', 'TEACHER_NOT_FOUND');
    }

    return true;
  }

  static async resetPassword(tenantId: string, teacherId: string, newPassword?: string) {
    const teacherResult = await pool.query(
      'SELECT email, full_name FROM teachers WHERE id = $1 AND tenant_id = $2',
      [teacherId, tenantId]
    );
    if (teacherResult.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy nhân sự', 'TEACHER_NOT_FOUND');
    }
    const { email, full_name } = teacherResult.rows[0];

    // Generate random password if not provided
    let finalPassword = newPassword;
    if (!finalPassword) {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      finalPassword = '';
      for (let i = 0; i < 10; i++) {
        finalPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(finalPassword, salt);

    const userResult = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 AND tenant_id = $3 RETURNING id',
      [passwordHash, email, tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy tài khoản đăng nhập tương ứng', 'USER_NOT_FOUND');
    }

    // Attempt to send email but don't fail if it doesn't work
    import('./email.service').then(({ sendNewUserPasswordEmail }) => {
      sendNewUserPasswordEmail(email, full_name, finalPassword as string).catch(() => {});
    });

    return {
      success: true,
      message: 'Cấp lại mật khẩu thành công',
      rawPassword: finalPassword,
    };
  }
}

import { ERROR_CODES } from '../utils/constants';
import pool from '../db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { NotFoundError, ValidationError } from '../utils/errors';
import { checkPlanLimit } from '../utils/limitChecker';
import { FeatureFlagService } from './feature-flag.service';
import { sendTeacherWelcomeEmail } from './email.service';
import { assertTenantReferences } from './tenant-reference.service';

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
    await assertTenantReferences(pool, tenantId, 'branches', [data.branch_id]);
    if (!data.full_name || !data.email || !data.branch_id) {
      throw new ValidationError(
        'Vui lòng điền đầy đủ thông tin bắt buộc',
        ERROR_CODES.MISSING_REQUIRED_FIELDS
      );
    }

    await checkPlanLimit(tenantId, 'max_teachers', 'teachers');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const teacherResult = await client.query(
        `INSERT INTO teachers (tenant_id, branch_id, full_name, email, phone, specialization) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [tenantId, data.branch_id, data.full_name, data.email, data.phone, data.specialization]
      );
      const teacher = teacherResult.rows[0];

      // The initial password is never known to the teacher; setup uses a one-time token.
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const verificationToken = crypto.randomUUID();
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [
        data.email,
      ]);

      if (existingUser.rows.length === 0) {
        await client.query(
          `INSERT INTO users (tenant_id, branch_id, email, password_hash, full_name, role, is_email_verified, verification_token, verification_token_expires, reset_password_token, reset_password_expires, onboarding_completed)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
        throw new ValidationError(
          'Email này đã tồn tại trong hệ thống',
          ERROR_CODES.EMAIL_ALREADY_EXISTS
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateTeacher(tenantId: string, teacherId: string, data: UpdateTeacherDTO) {
    await assertTenantReferences(pool, tenantId, 'branches', [data.branch_id]);
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
      throw new NotFoundError('Không tìm thấy nhân sự', ERROR_CODES.TEACHER_NOT_FOUND);
    }

    return result.rows[0];
  }

  static async deleteTeacher(tenantId: string, teacherId: string) {
    const result = await pool.query(
      `UPDATE teachers SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [teacherId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy nhân sự', ERROR_CODES.TEACHER_NOT_FOUND);
    }

    return true;
  }

  static async resetPassword(tenantId: string, teacherId: string, _newPassword?: string) {
    const teacherResult = await pool.query(
      'SELECT email, full_name FROM teachers WHERE id = $1 AND tenant_id = $2',
      [teacherId, tenantId]
    );
    if (teacherResult.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy nhân sự', ERROR_CODES.TEACHER_NOT_FOUND);
    }
    const { email } = teacherResult.rows[0];
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const resetToken = crypto.randomUUID();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    const userResult = await pool.query(
      `UPDATE users SET password_hash = $1, reset_password_token = $2,
         reset_password_expires = $3 WHERE email = $4 AND tenant_id = $5 RETURNING id`,
      [passwordHash, resetToken, resetExpires, email, tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError(
        'Không tìm thấy tài khoản đăng nhập tương ứng',
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userResult.rows[0].id]);
    import('./email.service').then(({ sendPasswordResetEmail }) => {
      sendPasswordResetEmail(email, resetToken).catch(() => {});
    });

    return {
      success: true,
      message: 'Liên kết đặt lại mật khẩu đã được gửi qua email',
    };
  }
}

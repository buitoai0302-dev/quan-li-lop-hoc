import type { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from '../db';
import { logger } from '../utils/logger';
import { ERROR_CODES, IMPORT_TYPES, ROLES, VIETNAM_TIME_ZONE } from '../utils/constants';
import { ValidationError } from '../utils/errors';
import { assertTenantReferences } from './tenant-reference.service';
import { lockTenantImport } from './import-lock.service';
import { sendTeacherWelcomeEmail } from './email.service';
import {
  MAX_IMPORT_ROWS,
  importPersonSchema,
  importRoomSchema,
  importClassSchema,
} from '../validators/import.validator';

const TEACHER_INVITATION_LIFETIME_MS = 24 * 60 * 60 * 1000;
interface ImportWriteResult {
  welcome?: { email: string; token: string; fullName: string };
}

async function writeImportRow(
  client: PoolClient,
  tenantId: string,
  type: string,
  input: unknown
): Promise<ImportWriteResult | null> {
  if (type === IMPORT_TYPES.STUDENTS || type === IMPORT_TYPES.TEACHERS) {
    const parsed = importPersonSchema.safeParse(input);
    if (!parsed.success) return null;
    const row = parsed.data;
    if (type === IMPORT_TYPES.STUDENTS) {
      const result = await client.query(
        `INSERT INTO students (tenant_id, branch_id, full_name, email, phone, date_of_birth, parent_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, email) DO NOTHING RETURNING id`,
        [
          tenantId,
          row.branch_id,
          row.full_name,
          row.email,
          row.phone,
          row.date_of_birth || null,
          row.parent_phone,
        ]
      );
      return result.rowCount ? {} : null;
    }
    const teacher = await client.query(
      `INSERT INTO teachers (tenant_id, branch_id, full_name, email, phone, specialization)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, email) DO NOTHING RETURNING id`,
      [tenantId, row.branch_id, row.full_name, row.email, row.phone, row.specialization || null]
    );
    if (!teacher.rowCount) return null;
    // Account email is a platform-wide login identity. Never modify an existing account.
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [row.email]);
    if (existingUser.rows.length) return {};
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TEACHER_INVITATION_LIFETIME_MS);
    await client.query(
      `INSERT INTO users (tenant_id, branch_id, email, password_hash, full_name, role,
         is_email_verified, verification_token, verification_token_expires,
         reset_password_token, reset_password_expires, onboarding_completed)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, $7, $8, true)`,
      [
        tenantId,
        row.branch_id,
        row.email,
        passwordHash,
        row.full_name,
        ROLES.TEACHER,
        token,
        expiresAt,
      ]
    );
    return { welcome: { email: row.email, token, fullName: row.full_name } };
  }

  if (type === IMPORT_TYPES.ROOMS) {
    const parsed = importRoomSchema.safeParse(input);
    if (!parsed.success) return null;
    const row = parsed.data;
    const result = await client.query(
      `INSERT INTO rooms (tenant_id, branch_id, name, capacity, room_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, branch_id, name) DO NOTHING RETURNING id`,
      [tenantId, row.branch_id, row.name, row.capacity, row.room_type]
    );
    return result.rowCount ? {} : null;
  }

  const parsed = importClassSchema.safeParse(input);
  if (!parsed.success) return null;
  const row = parsed.data;
  // There is no unique (tenant, branch, name) constraint on classes. The shared
  // import lock makes this check safe against both concurrent import endpoints.
  const duplicate = await client.query(
    'SELECT id FROM classes WHERE tenant_id = $1 AND branch_id = $2 AND name = $3 AND is_deleted = false LIMIT 1',
    [tenantId, row.branch_id, row.name]
  );
  if (duplicate.rows.length) return null;
  const teacher = await client.query<{ id: string }>(
    'SELECT id FROM teachers WHERE tenant_id = $1 AND email = $2 AND is_deleted = false',
    [tenantId, row.teacher_email]
  );
  if (!teacher.rows.length) return null;
  let subjectId = (
    await client.query<{ id: string }>(
      'SELECT id FROM subjects WHERE tenant_id = $1 ORDER BY created_at, id LIMIT 1',
      [tenantId]
    )
  ).rows[0]?.id;
  if (!subjectId) {
    subjectId = (
      await client.query<{ id: string }>(
        `INSERT INTO subjects (tenant_id, name, code) VALUES ($1, 'General', 'GEN')
       ON CONFLICT (tenant_id, code) DO UPDATE SET code = EXCLUDED.code RETURNING id`,
        [tenantId]
      )
    ).rows[0].id;
  }
  await client.query(
    `INSERT INTO classes (tenant_id, branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6,
       COALESCE($7::date, (CURRENT_TIMESTAMP AT TIME ZONE $9)::date),
       COALESCE($8::date, $7::date, (CURRENT_TIMESTAMP AT TIME ZONE $9)::date))`,
    [
      tenantId,
      row.branch_id,
      subjectId,
      teacher.rows[0].id,
      row.name,
      row.max_capacity,
      row.start_date || null,
      row.end_date || null,
      VIETNAM_TIME_ZONE,
    ]
  );
  return {};
}

export class ImportService {
  static async importData(tenantId: string, type: string, data: unknown) {
    if (!Object.values(IMPORT_TYPES).some((value) => value === type)) {
      throw new ValidationError('Unsupported import type', ERROR_CODES.INVALID_IMPORT_TYPE);
    }
    if (!Array.isArray(data) || data.length === 0) {
      throw new ValidationError('No data provided', ERROR_CODES.MISSING_REQUIRED_FIELDS);
    }
    if (data.length > MAX_IMPORT_ROWS) {
      throw new ValidationError('Import batch too large', ERROR_CODES.IMPORT_BATCH_TOO_LARGE);
    }
    const rows: unknown[] = data;
    const branches = rows.map((row) => {
      if (!row || typeof row !== 'object' || !('branch_id' in row)) return undefined;
      if (row.branch_id != null && typeof row.branch_id !== 'string') {
        throw new ValidationError('Invalid branch reference', ERROR_CODES.INVALID_TENANT_REFERENCE);
      }
      return row.branch_id as string | null | undefined;
    });
    await assertTenantReferences(pool, tenantId, 'branches', branches);

    let successCount = 0;
    let skipCount = 0;
    for (const input of rows) {
      const client = await pool.connect();
      let result: ImportWriteResult | null = null;
      try {
        await client.query('BEGIN');
        await lockTenantImport(client, tenantId);
        result = await writeImportRow(client, tenantId, type, input);
        await client.query(result ? 'COMMIT' : 'ROLLBACK');
        if (result) successCount++;
        else skipCount++;
      } catch {
        await client.query('ROLLBACK');
        result = null;
        skipCount++;
        logger.warn({ operation: 'IMPORT_ROW_FAILED', tenantId, type }, 'Import row rolled back');
      } finally {
        client.release();
      }
      if (result?.welcome) {
        const { email, token, fullName } = result.welcome;
        await sendTeacherWelcomeEmail(email, token, fullName).catch(() => {
          logger.warn(
            { operation: 'IMPORT_WELCOME_EMAIL_FAILED', tenantId },
            'Teacher invitation failed after commit'
          );
        });
      }
    }
    return {
      success: true,
      message: `Imported ${successCount} records. Skipped ${skipCount} records.`,
      successCount,
      skipCount,
    };
  }
}

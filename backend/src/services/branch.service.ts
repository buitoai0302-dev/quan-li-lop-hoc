import pool from '../db';
import { NotFoundError, ValidationError } from '../utils/errors';
import { checkPlanLimit } from '../utils/limitChecker';
import { FeatureFlagService } from './feature-flag.service';

export interface CreateBranchDTO {
  name: string;
  address?: string;
  phone?: string;
}

export interface UpdateBranchDTO {
  name?: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
}

export class BranchService {
  static async getBranches(tenantId: string) {
    const result = await pool.query(
      `SELECT * FROM branches WHERE tenant_id = $1 AND is_deleted = false ORDER BY created_at ASC`,
      [tenantId]
    );

    const limit = await FeatureFlagService.checkLimit(tenantId, 'max_branches');
    if (limit > 0) {
      return result.rows.slice(0, limit);
    }

    return result.rows;
  }

  static async createBranch(tenantId: string, data: CreateBranchDTO) {
    if (!data.name) {
      throw new ValidationError('Vui lòng điền tên chi nhánh', 'MISSING_REQUIRED_FIELDS');
    }

    await checkPlanLimit(tenantId, 'max_branches', 'branches', 'LIMIT_EXCEEDED');

    const result = await pool.query(
      `INSERT INTO branches (tenant_id, name, address, phone) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [tenantId, data.name, data.address, data.phone]
    );

    return result.rows[0];
  }

  static async updateBranch(tenantId: string, branchId: string, data: UpdateBranchDTO) {
    const result = await pool.query(
      `UPDATE branches 
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           phone = COALESCE($3, phone),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [data.name, data.address, data.phone, data.is_active, branchId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy chi nhánh', 'BRANCH_NOT_FOUND');
    }

    return result.rows[0];
  }

  static async deleteBranch(tenantId: string, branchId: string) {
    const result = await pool.query(
      `UPDATE branches SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [branchId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy chi nhánh', 'BRANCH_NOT_FOUND');
    }

    return true;
  }

  static async updateFirstBranch(tenantId: string, data: CreateBranchDTO) {
    if (!data.name) {
      throw new ValidationError('Tên chi nhánh không được để trống', 'MISSING_REQUIRED_FIELDS');
    }

    const findResult = await pool.query(
      `SELECT id FROM branches WHERE tenant_id = $1 AND is_deleted = false ORDER BY created_at ASC LIMIT 1`,
      [tenantId]
    );

    let result;
    if (findResult.rows.length > 0) {
      result = await pool.query(
        `UPDATE branches 
         SET name = $1, address = COALESCE($2, address), phone = COALESCE($3, phone)
         WHERE id = $4 AND tenant_id = $5 RETURNING *`,
        [data.name, data.address, data.phone, findResult.rows[0].id, tenantId]
      );
    } else {
      result = await pool.query(
        `INSERT INTO branches (tenant_id, name, address, phone) VALUES ($1, $2, $3, $4) RETURNING *`,
        [tenantId, data.name, data.address, data.phone]
      );
    }

    return result.rows[0];
  }
}

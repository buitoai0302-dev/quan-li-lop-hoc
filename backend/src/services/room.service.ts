import pool from '../db';
import { NotFoundError, ValidationError } from '../utils/errors';
import { checkPlanLimit } from '../utils/limitChecker';
import { FeatureFlagService } from './feature-flag.service';

export interface CreateRoomDTO {
  branch_id: string;
  name: string;
  capacity?: number;
  room_type?: string;
}

export interface UpdateRoomDTO {
  branch_id?: string;
  name?: string;
  capacity?: number;
  room_type?: string;
  is_active?: boolean;
}

export class RoomService {
  static async getRooms(tenantId: string) {
    const result = await pool.query(
      `SELECT r.*, b.name as branch_name 
       FROM rooms r
       LEFT JOIN branches b ON r.branch_id = b.id
       WHERE r.tenant_id = $1 AND r.is_deleted = false
       ORDER BY r.name ASC`,
      [tenantId]
    );

    const limit = await FeatureFlagService.checkLimit(tenantId, 'max_rooms');
    if (limit > 0) {
      return result.rows.slice(0, limit);
    }

    return result.rows;
  }

  static async createRoom(tenantId: string, data: CreateRoomDTO) {
    if (!data.branch_id || !data.name) {
      throw new ValidationError('Vui lòng điền tên phòng và chi nhánh', 'MISSING_REQUIRED_FIELDS');
    }

    await checkPlanLimit(tenantId, 'max_rooms', 'rooms', 'LIMIT_EXCEEDED');

    const result = await pool.query(
      `INSERT INTO rooms (tenant_id, branch_id, name, capacity, room_type) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, data.branch_id, data.name, data.capacity || 30, data.room_type || 'classroom']
    );

    return result.rows[0];
  }

  static async updateRoom(tenantId: string, roomId: string, data: UpdateRoomDTO) {
    const result = await pool.query(
      `UPDATE rooms 
       SET branch_id = COALESCE($1, branch_id),
           name = COALESCE($2, name),
           capacity = COALESCE($3, capacity),
           room_type = COALESCE($4, room_type),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [data.branch_id, data.name, data.capacity, data.room_type, data.is_active, roomId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy phòng học', 'ROOM_NOT_FOUND');
    }

    return result.rows[0];
  }

  static async deleteRoom(tenantId: string, roomId: string) {
    const result = await pool.query(
      `UPDATE rooms SET is_deleted = true WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [roomId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy phòng học', 'ROOM_NOT_FOUND');
    }

    return true;
  }
}

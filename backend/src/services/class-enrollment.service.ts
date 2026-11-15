import type { PoolClient } from 'pg';
import { ERROR_CODES } from '../utils/constants';
import { NotFoundError, ValidationError } from '../utils/errors';

export async function lockClassForEnrollment(
  client: PoolClient,
  tenantId: string,
  classId: string
) {
  const {
    rows: [target],
  } = await client.query<{ max_capacity: number }>(
    `SELECT max_capacity FROM classes
     WHERE tenant_id = $1 AND id = $2 AND is_deleted = false FOR NO KEY UPDATE`,
    [tenantId, classId]
  );
  if (!target) throw new NotFoundError('Class not found', ERROR_CODES.CLASS_NOT_FOUND);
  return target.max_capacity;
}

export async function updateClassEnrollments(
  client: PoolClient,
  tenantId: string,
  classId: string,
  maxCapacity: number,
  addedIds: readonly string[],
  removedIds: readonly string[],
  options: { replace?: boolean; previousCapacity?: number } = {}
) {
  // Callers own the class row lock, including the transaction that creates a new class.
  const { rows } = await client.query<{ student_id: string }>(
    'SELECT student_id FROM class_students WHERE tenant_id = $1 AND class_id = $2',
    [tenantId, classId]
  );
  const currentIds = new Set(rows.map(({ student_id }) => student_id));
  const nextIds = options.replace ? new Set<string>() : new Set(currentIds);
  for (const id of removedIds) nextIds.delete(id.toLowerCase());
  for (const id of addedIds) nextIds.add(id.toLowerCase());

  // Existing over-capacity classes may remove students or edit unrelated details.
  const allowedCount = Math.max(maxCapacity, currentIds.size);
  const lowersCapacity = options.previousCapacity != null && maxCapacity < options.previousCapacity;
  if (nextIds.size > allowedCount || (lowersCapacity && nextIds.size > maxCapacity)) {
    throw new ValidationError('Class capacity exceeded', ERROR_CODES.CAPACITY_EXCEEDED);
  }

  const removals = [...currentIds].filter((id) => !nextIds.has(id));
  if (removals.length) {
    await client.query(
      'DELETE FROM class_students WHERE tenant_id = $1 AND class_id = $2 AND student_id = ANY($3::uuid[])',
      [tenantId, classId, removals]
    );
  }
  const additions = [...nextIds].filter((id) => !currentIds.has(id));
  if (!additions.length) return [];

  const result = await client.query(
    `INSERT INTO class_students (tenant_id, class_id, student_id)
     SELECT $1, $2, student_id FROM unnest($3::uuid[]) AS student_id
     ON CONFLICT (class_id, student_id) DO NOTHING
     RETURNING *`,
    [tenantId, classId, additions]
  );
  return result.rows;
}

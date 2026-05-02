import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const importData = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { type } = req.params; // 'students', 'teachers', 'rooms'
    const { data } = req.body; // array of objects

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }

    let successCount = 0;
    let skipCount = 0;

    if (type === 'students') {
      for (const row of data) {
        try {
          const { full_name, email, phone, date_of_birth, branch_id } = row;
          if (!full_name || !email || !branch_id) {
            skipCount++;
            continue;
          }

          const result = await pool.query(
            `INSERT INTO students (tenant_id, branch_id, full_name, email, phone, date_of_birth) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (tenant_id, email) DO NOTHING 
             RETURNING id`,
            [tenantId, branch_id, full_name, email, phone, date_of_birth || null]
          );

          if (result.rowCount && result.rowCount > 0) {
            successCount++;
          } else {
            skipCount++; // Conflict occurred, so DO NOTHING skipped it
          }
        } catch (err) {
          console.error('Error inserting student row:', err);
          skipCount++;
        }
      }
    } else if (type === 'teachers') {
      for (const row of data) {
        try {
          const { full_name, email, phone, specialization, branch_id } = row;
          if (!full_name || !email || !branch_id) {
            skipCount++;
            continue;
          }

          const result = await pool.query(
            `INSERT INTO teachers (tenant_id, branch_id, full_name, email, phone, specialization) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (tenant_id, email) DO NOTHING 
             RETURNING id`,
            [tenantId, branch_id, full_name, email, phone, specialization || null]
          );

          if (result.rowCount && result.rowCount > 0) {
            successCount++;
          } else {
            skipCount++;
          }
        } catch (err) {
          console.error('Error inserting teacher row:', err);
          skipCount++;
        }
      }
    } else if (type === 'rooms') {
      for (const row of data) {
        try {
          const { name, capacity, room_type, branch_id } = row;
          if (!name || !branch_id) {
            skipCount++;
            continue;
          }

          const result = await pool.query(
            `INSERT INTO rooms (tenant_id, branch_id, name, capacity, room_type) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (tenant_id, branch_id, name) DO NOTHING 
             RETURNING id`,
            [tenantId, branch_id, name, parseInt(capacity, 10) || 30, room_type || 'classroom']
          );

          if (result.rowCount && result.rowCount > 0) {
            successCount++;
          } else {
            skipCount++;
          }
        } catch (err) {
          console.error('Error inserting room row:', err);
          skipCount++;
        }
      }
    } else if (type === 'classes') {
      for (const row of data) {
        try {
          const { name, max_capacity, start_date, end_date, teacher_email, branch_id } = row;
          if (!name || !branch_id || !teacher_email) {
            skipCount++;
            continue;
          }

          // Check if class already exists in branch
          const existRes = await pool.query(
            `SELECT id FROM classes WHERE tenant_id = $1 AND branch_id = $2 AND name = $3`,
            [tenantId, branch_id, name]
          );
          if (existRes.rows.length > 0) {
            skipCount++;
            continue; // Class already exists
          }

          // Find teacher by email
          const teacherRes = await pool.query(
            `SELECT id FROM teachers WHERE tenant_id = $1 AND email = $2`,
            [tenantId, teacher_email]
          );
          if (teacherRes.rows.length === 0) {
            skipCount++;
            continue; // Teacher not found
          }
          const teacherId = teacherRes.rows[0].id;

          // Find or create default subject
          let subjectId = null;
          const subRes = await pool.query(`SELECT id FROM subjects WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
          if (subRes.rows.length > 0) {
            subjectId = subRes.rows[0].id;
          } else {
            const newSub = await pool.query(
              `INSERT INTO subjects (tenant_id, name, code) VALUES ($1, 'General', 'GEN') RETURNING id`, 
              [tenantId]
            );
            subjectId = newSub.rows[0].id;
          }

          const result = await pool.query(
            `INSERT INTO classes (tenant_id, branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING id`,
            [tenantId, branch_id, subjectId, teacherId, name, parseInt(max_capacity, 10) || 30, start_date || new Date().toISOString().split('T')[0], end_date || new Date().toISOString().split('T')[0]]
          );

          if (result.rowCount && result.rowCount > 0) {
            successCount++;
          } else {
            skipCount++;
          }
        } catch (err) {
          console.error('Error inserting class row:', err);
          skipCount++;
        }
      }
    } else {
      return res.status(400).json({ error: 'Unsupported import type' });
    }

    res.json({ success: true, message: `Imported ${successCount} records. Skipped ${skipCount} records.` });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

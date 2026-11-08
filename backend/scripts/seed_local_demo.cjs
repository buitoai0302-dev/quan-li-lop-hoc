// Creates one isolated, synthetic tenant for local UI checks. Never deletes existing data.
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config({ quiet: true });

const email = 'pilot.local.20261024@example.test';

async function main() {
  if (process.env.ALLOW_SAMPLE_SEED !== 'yes') {
    throw new Error('Set ALLOW_SAMPLE_SEED=yes to create the isolated demo tenant');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [email]);

    const existing = await client.query('SELECT id FROM tenants WHERE contact_email = $1', [email]);
    if (existing.rowCount) {
      await client.query('ROLLBACK');
      console.log(JSON.stringify({ status: 'exists', tenantId: existing.rows[0].id, email }));
      return;
    }

    const plan = await client.query("SELECT id FROM plan_definitions WHERE code = 'PRO' AND is_active = true");
    if (!plan.rowCount) throw new Error('Active PRO plan is missing');

    const password = `Pil0t!${crypto.randomBytes(18).toString('base64url')}`;
    const passwordHash = await bcrypt.hash(password, 12);
    const tenant = await client.query(
      `INSERT INTO tenants (plan_id, name, contact_email, status, is_active, plan_expires_at)
       VALUES ($1, $2, $3, 'active', true, CURRENT_DATE + INTERVAL '90 days') RETURNING id`,
      [plan.rows[0].id, 'Pilot Local Demo', email]
    );
    const tenantId = tenant.rows[0].id;

    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_active, is_email_verified, onboarding_completed)
       VALUES ($1, $2, $3, 'Pilot Demo Admin', 'admin', true, true, true)`,
      [tenantId, email, passwordHash]
    );

    const branch = await client.query(
      `INSERT INTO branches (tenant_id, name, address) VALUES ($1, 'Chi nhánh mẫu', 'Địa chỉ giả lập') RETURNING id`,
      [tenantId]
    );
    const branchId = branch.rows[0].id;
    const room = await client.query(
      `INSERT INTO rooms (tenant_id, branch_id, name, capacity) VALUES ($1, $2, 'Phòng A1', 20) RETURNING id`,
      [tenantId, branchId]
    );
    const teacher = await client.query(
      `INSERT INTO teachers (tenant_id, branch_id, full_name, email, specialization)
       VALUES ($1, $2, 'Giáo viên Mẫu', 'teacher.pilot.local@example.test', 'Tiếng Anh') RETURNING id`,
      [tenantId, branchId]
    );
    const subject = await client.query(
      `INSERT INTO subjects (tenant_id, name, code, description)
       VALUES ($1, 'Tiếng Anh giao tiếp mẫu', 'ENG-DEMO', 'Dữ liệu giả lập cho local') RETURNING id`,
      [tenantId]
    );
    const classRow = await client.query(
      `INSERT INTO classes (tenant_id, branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, 'Lớp giao tiếp mẫu', 20, CURRENT_DATE - 7, CURRENT_DATE + 90, 'active') RETURNING id`,
      [tenantId, branchId, subject.rows[0].id, teacher.rows[0].id]
    );
    const classId = classRow.rows[0].id;

    for (let i = 1; i <= 4; i++) {
      const student = await client.query(
        `INSERT INTO students (tenant_id, branch_id, full_name, email)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tenantId, branchId, `Học viên Mẫu ${i}`, `student${i}.pilot.local@example.test`]
      );
      const studentId = student.rows[0].id;
      await client.query(
        `INSERT INTO class_students (tenant_id, class_id, student_id, status)
         VALUES ($1, $2, $3, 'enrolled')`,
        [tenantId, classId, studentId]
      );
      const tuition = await client.query(
        `INSERT INTO tuitions (tenant_id, student_id, class_id, billing_cycle, billing_period, amount, discount, due_date, status)
         VALUES ($1, $2, $3, 'monthly', to_char(CURRENT_DATE, 'YYYY-MM'), 1200000, 0,
                 CURRENT_DATE + 7, $4) RETURNING id`,
        [tenantId, studentId, classId, i === 1 ? 'paid' : 'unpaid']
      );
      if (i === 1) {
        await client.query(
          `INSERT INTO payments (tenant_id, tuition_id, amount_paid, payment_method, notes)
           VALUES ($1, $2, 1200000, 'bank_transfer', 'Thanh toán giả lập')`,
          [tenantId, tuition.rows[0].id]
        );
      }
    }

    for (const offset of [0, 2, 5]) {
      await client.query(
        `INSERT INTO schedule_sessions
           (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time, session_type, status, notes)
         VALUES ($1, $2, $3, $4, CURRENT_DATE + $5::int, '18:00', '19:30', 'lecture', 'scheduled', 'Buổi học giả lập')`,
        [tenantId, classId, room.rows[0].id, teacher.rows[0].id, offset]
      );
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({ status: 'created', tenantId, email, password, branches: 1, classes: 1, students: 4, sessions: 3 }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('SEED_FAILED', error.code || error.message);
  process.exitCode = 1;
});

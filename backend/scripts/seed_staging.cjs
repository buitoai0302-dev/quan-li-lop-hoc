// Synthetic fixtures for a fresh, isolated DB named eduschedule_staging.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const url = process.env.STAGING_DATABASE_URL;
if (!url || process.env.STAGING_CONFIRMATION !== 'isolated-synthetic-staging') {
  throw new Error('STAGING_DATABASE_URL and STAGING_CONFIRMATION are required');
}
const parsed = new URL(url);
if (parsed.pathname !== '/eduschedule_staging' ||
    parsed.searchParams.get('sslmode') !== 'verify-full' ||
    parsed.searchParams.get('uselibpqcompat') === 'true') {
  throw new Error('Refusing to seed a DB not named eduschedule_staging with verified TLS');
}

const outputRoot = path.resolve(__dirname, '../../qa');
const loadPath = path.join(outputRoot, 'load/users.local.json');
const rolesPath = path.join(outputRoot, 'staging/roles.local.json');
if (fs.existsSync(loadPath) || fs.existsSync(rolesPath)) {
  throw new Error('Local staging credential files already exist; refusing to overwrite');
}
const centers = [
  { name: 'QA Center Free', code: 'FREE', studentCount: 25 },
  { name: 'QA Center Pro', code: 'PRO', studentCount: 100 },
  { name: 'QA Center Business', code: 'BUSINESS', studentCount: 150 },
];

const password = () => `Qa!${crypto.randomBytes(20).toString('base64url')}`;

async function insertUser(client, tenantId, branchId, email, fullName, role, rawPassword) {
  const hash = await bcrypt.hash(rawPassword, 10);
  await client.query(
    `INSERT INTO users (tenant_id, branch_id, email, password_hash, full_name, role,
                        is_active, is_email_verified, onboarding_completed)
     VALUES ($1, $2, $3, $4, $5, $6, true, true, true)`,
    [tenantId, branchId, email, hash, fullName, role]
  );
}

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  const loadUsers = [];
  const roleUsers = [];
  let wroteLoad = false;
  let wroteRoles = false;
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT COUNT(*)::int AS count FROM tenants');
    if (existing.rows[0].count !== 0) {
      throw new Error('Staging seed requires an empty tenants table');
    }
    const plans = await client.query(
      "SELECT id, code FROM plan_definitions WHERE code = ANY($1::text[]) AND is_active = true",
      [centers.map((center) => center.code)]
    );
    const planIds = new Map(plans.rows.map((row) => [row.code, row.id]));
    if (planIds.size !== centers.length) throw new Error('FREE, PRO and BUSINESS plans must be active');

    for (let centerIndex = 0; centerIndex < centers.length; centerIndex++) {
      const center = centers[centerIndex];
      const tenant = await client.query(
        `INSERT INTO tenants (plan_id, name, contact_email, status, is_active)
         VALUES ($1, $2, $3, 'active', true) RETURNING id`,
        [planIds.get(center.code), center.name, `qa.staging.${center.code.toLowerCase()}@example.test`]
      );
      const tenantId = tenant.rows[0].id;
      const branch = await client.query(
        'INSERT INTO branches (tenant_id, name) VALUES ($1, $2) RETURNING id',
        [tenantId, `${center.name} Branch`]
      );
      const branchId = branch.rows[0].id;
      const teacherEmail = `qa.teacher.${center.code.toLowerCase()}@example.test`;
      const teacher = await client.query(
        `INSERT INTO teachers (tenant_id, branch_id, full_name, email)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tenantId, branchId, `${center.name} Teacher`, teacherEmail]
      );
      const subject = await client.query(
        `INSERT INTO subjects (tenant_id, name, code) VALUES ($1, 'Synthetic subject', 'QA') RETURNING id`,
        [tenantId]
      );
      const room = await client.query(
        `INSERT INTO rooms (tenant_id, branch_id, name, capacity)
         VALUES ($1, $2, 'QA Room', 50) RETURNING id`,
        [tenantId, branchId]
      );
      const classes = [];
      for (let j = 0; j < 5; j++) {
        const classRow = await client.query(
          `INSERT INTO classes (tenant_id, branch_id, subject_id, teacher_id, name,
                                start_date, end_date)
           VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - 30, CURRENT_DATE + 120) RETURNING id`,
          [tenantId, branchId, subject.rows[0].id, teacher.rows[0].id, `${center.name} Class ${j + 1}`]
        );
        classes.push(classRow.rows[0].id);
        for (let week = 0; week < 8; week++) {
          await client.query(
            `INSERT INTO schedule_sessions (tenant_id, class_id, room_id, teacher_id,
                                            session_date, start_time, end_time, status)
             VALUES ($1, $2, $3, $4, CURRENT_DATE + ($5::int * 7) + $6::int,
                     '09:00', '10:30', 'scheduled')`,
            [tenantId, classRow.rows[0].id, room.rows[0].id, teacher.rows[0].id, week, j]
          );
        }
      }

      const studentIds = [];
      for (let j = 0; j < center.studentCount; j++) {
        const studentName = `${center.name} Student ${j + 1}`;
        const studentEmail = `qa.student.${center.code.toLowerCase()}.${j + 1}@example.test`;
        const student = await client.query(
          `INSERT INTO students (tenant_id, branch_id, full_name, email)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [tenantId, branchId, studentName, studentEmail]
        );
        const studentId = student.rows[0].id;
        studentIds.push({ id: studentId, name: studentName, email: studentEmail });
        const classId = classes[j % classes.length];
        await client.query(
          `INSERT INTO class_students (tenant_id, class_id, student_id)
           VALUES ($1, $2, $3)`,
          [tenantId, classId, studentId]
        );
        await client.query(
          `INSERT INTO tuitions (tenant_id, student_id, class_id, billing_cycle,
                                billing_period, amount, discount, due_date, status)
           VALUES ($1, $2, $3, 'monthly', to_char(CURRENT_DATE, 'YYYY-MM'),
                   1200000, 0, CURRENT_DATE + 10, 'unpaid')`,
          [tenantId, studentId, classId]
        );
      }

      const teacherPassword = password();
      await insertUser(client, tenantId, branchId, teacherEmail,
        `${center.name} Teacher`, 'teacher', teacherPassword);
      roleUsers.push({ email: teacherEmail, password: teacherPassword, role: 'teacher', center: center.code });
      const studentPassword = password();
      await insertUser(client, tenantId, branchId, studentIds[0].email,
        studentIds[0].name, 'student', studentPassword);
      roleUsers.push({ email: studentIds[0].email, password: studentPassword, role: 'student', center: center.code });

      const accounts = centerIndex === 0 ? 17 : centerIndex === 1 ? 17 : 16;
      for (let j = 0; j < accounts; j++) {
        const role = j === 0 ? 'admin' : 'staff';
        const email = `qa.load.${center.code.toLowerCase()}.${j + 1}@example.test`;
        const rawPassword = password();
        await insertUser(client, tenantId, branchId, email, `QA ${role} ${j + 1}`, role, rawPassword);
        loadUsers.push({
          email, password: rawPassword,
          writeStudentId: studentIds[j].id,
          writeStudentName: studentIds[j].name,
        });
        if (j === 0) roleUsers.push({
          email, password: rawPassword, role, center: center.code,
          tenantId, branchId, classId: classes[0], studentId: studentIds[0].id,
        });
      }
    }

    const superPassword = password();
    const superTenant = roleUsers.find((user) => user.role === 'admin' && user.center === 'FREE');
    await insertUser(client, superTenant.tenantId, null, 'qa.superadmin@example.test',
      'QA Super Admin', 'super_admin', superPassword);
    roleUsers.push({ email: 'qa.superadmin@example.test', password: superPassword, role: 'super_admin' });

    fs.mkdirSync(path.dirname(loadPath), { recursive: true });
    fs.mkdirSync(path.dirname(rolesPath), { recursive: true });
    fs.writeFileSync(loadPath, JSON.stringify(loadUsers, null, 2), { mode: 0o600, flag: 'wx' });
    wroteLoad = true;
    fs.writeFileSync(rolesPath, JSON.stringify(roleUsers, null, 2), { mode: 0o600, flag: 'wx' });
    wroteRoles = true;
    await client.query('COMMIT');
    console.log('Created 3 synthetic centers, 275 students and 50 load users. Local credentials are ignored by Git.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (wroteLoad) fs.rmSync(loadPath);
    if (wroteRoles) fs.rmSync(rolesPath);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('STAGING_SEED_FAILED', error.message);
  process.exitCode = 1;
});

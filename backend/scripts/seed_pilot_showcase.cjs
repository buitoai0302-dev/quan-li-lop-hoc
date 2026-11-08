// Enrich only the isolated Pilot Local Demo tenant. Default mode rolls every change back.
// Run with ALLOW_SAMPLE_SEED=yes node scripts/seed_pilot_showcase.cjs [--apply].
const { Client } = require('pg');
require('dotenv').config({ quiet: true });

const demoEmail = 'pilot.local.20261024@example.test';
const marker = 'pilot-showcase-v1';
const sessionNote = 'Buổi học demo';
const monthCounts = [4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 10]; // oldest to newest
const names = ['Nguyễn An', 'Trần Bình', 'Lê Chi', 'Phạm Duy', 'Hoàng Hà', 'Vũ Khánh', 'Đỗ Linh', 'Bùi Minh', 'Ngô Ngọc', 'Đặng Phúc', 'Mai Quỳnh', 'Cao Sơn'];

async function exactlyOne(client, sql, params, label) {
  const result = await client.query(sql, params);
  if (result.rowCount !== 1) throw new Error(`${label}: expected one row, got ${result.rowCount}`);
  return result.rows[0];
}

async function ensure(client, selectSql, selectParams, insertSql, insertParams, label) {
  const found = await client.query(selectSql, selectParams);
  if (found.rowCount > 1) throw new Error(`${label}: duplicate rows`);
  if (found.rowCount === 1) return found.rows[0];
  return exactlyOne(client, insertSql, insertParams, label);
}

async function main() {
  if (process.env.ALLOW_SAMPLE_SEED !== 'yes') throw new Error('Set ALLOW_SAMPLE_SEED=yes for this isolated demo seed');
  const apply = process.argv.includes('--apply');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [demoEmail]);
    const tenant = await exactlyOne(client,
      `SELECT t.id, t.name, p.code AS plan, t.plan_id FROM tenants t
       JOIN plan_definitions p ON p.id = t.plan_id
       JOIN users u ON u.tenant_id = t.id AND u.email = $1 AND u.role = 'admin'
       WHERE t.contact_email = $1 AND t.name = 'Pilot Local Demo' AND t.is_active = true`,
      [demoEmail], 'pilot tenant');
    if (tenant.plan !== 'PRO') throw new Error(`Expected PRO pilot tenant, got ${tenant.plan}`);
    const tenantId = tenant.id;
    const limitRows = await client.query('SELECT limit_key, limit_value FROM plan_limits WHERE plan_id = $1', [tenant.plan_id]);
    const limits = Object.fromEntries(limitRows.rows.map(row => [row.limit_key, Number(row.limit_value)]));
    const current = await exactlyOne(client,
      `SELECT (SELECT COUNT(*)::int FROM students WHERE tenant_id = $1 AND is_deleted = false) AS students,
              (SELECT COUNT(*)::int FROM classes WHERE tenant_id = $1 AND is_deleted = false) AS classes,
              (SELECT COUNT(*)::int FROM branches WHERE tenant_id = $1 AND is_deleted = false) AS branches`,
      [tenantId], 'current counts');
    const targetStudents = monthCounts.reduce((sum, count) => sum + count, 0);
    const existingShowcase = await exactlyOne(client,
      `SELECT (SELECT COUNT(*)::int FROM students WHERE tenant_id = $1 AND email LIKE 'showcase.student.%@example.test') AS students,
              (SELECT COUNT(*)::int FROM classes WHERE tenant_id = $1 AND name LIKE 'Demo • %') AS classes,
              (SELECT COUNT(*)::int FROM branches WHERE tenant_id = $1 AND name IN ('Demo • Cơ sở Quận 3', 'Demo • Cơ sở Thủ Đức')) AS branches`,
      [tenantId], 'showcase counts');
    if (existingShowcase.students > targetStudents || existingShowcase.classes > 8 || existingShowcase.branches > 2) {
      throw new Error('Unexpected number of existing showcase records');
    }
    if (current.students + targetStudents - existingShowcase.students > (limits.max_students || Infinity)) throw new Error('PRO student limit would be exceeded');
    if (current.classes + 8 - existingShowcase.classes > (limits.max_classes || Infinity)) throw new Error('PRO class limit would be exceeded');
    if (current.branches + 2 - existingShowcase.branches > (limits.max_branches || Infinity)) throw new Error('PRO branch limit would be exceeded');

    const summary = { mode: apply ? 'apply' : 'dry-run', tenant: tenant.name, inserted: {} };
    const count = (name, amount = 1) => { summary.inserted[name] = (summary.inserted[name] || 0) + amount; };
    const renamed = await client.query(
      `UPDATE schedule_sessions SET notes = $2 WHERE tenant_id = $1 AND notes = $3`,
      [tenantId, sessionNote, marker]);
    if (renamed.rowCount) summary.renamedSessionNotes = renamed.rowCount;

    const branchSpecs = [
      { name: 'Chi nhánh mẫu', address: 'Địa chỉ giả lập' },
      { name: 'Demo • Cơ sở Quận 3', address: 'Địa chỉ demo, Quận 3' },
      { name: 'Demo • Cơ sở Thủ Đức', address: 'Địa chỉ demo, Thủ Đức' },
    ];
    const branches = [];
    for (const spec of branchSpecs) {
      const found = await client.query('SELECT id FROM branches WHERE tenant_id = $1 AND name = $2 AND is_deleted = false', [tenantId, spec.name]);
      const row = found.rowCount === 1 ? found.rows[0] : await ensure(client,
        'SELECT id FROM branches WHERE tenant_id = $1 AND name = $2', [tenantId, spec.name],
        'INSERT INTO branches (tenant_id, name, address) VALUES ($1, $2, $3) RETURNING id', [tenantId, spec.name, spec.address], `branch ${spec.name}`);
      if (!found.rowCount) count('branches');
      branches.push(row.id);
    }

    const roomSpecs = [
      { branch: 0, name: 'Phòng A1' }, { branch: 0, name: 'Demo • Phòng A2' },
      { branch: 1, name: 'Demo • Phòng B1' }, { branch: 2, name: 'Demo • Phòng C1' },
    ];
    const rooms = [];
    for (const spec of roomSpecs) {
      const found = await client.query('SELECT id FROM rooms WHERE tenant_id = $1 AND branch_id = $2 AND name = $3', [tenantId, branches[spec.branch], spec.name]);
      if (found.rowCount > 1) throw new Error(`room ${spec.name}: duplicate rows`);
      const row = found.rowCount ? found.rows[0] : await exactlyOne(client,
        'INSERT INTO rooms (tenant_id, branch_id, name, capacity) VALUES ($1, $2, $3, 20) RETURNING id',
        [tenantId, branches[spec.branch], spec.name], `room ${spec.name}`);
      if (!found.rowCount) count('rooms');
      rooms.push(row.id);
    }

    const teacherSpecs = [
      { branch: 0, name: 'Demo • Cô Minh Anh', subject: 'Tiếng Anh' },
      { branch: 0, name: 'Demo • Thầy Quốc Bảo', subject: 'Toán' },
      { branch: 1, name: 'Demo • Cô Bích Ngọc', subject: 'Tiếng Anh' },
      { branch: 1, name: 'Demo • Thầy Hoàng Nam', subject: 'Khoa học' },
      { branch: 2, name: 'Demo • Cô Thanh Hà', subject: 'Tiếng Anh' },
      { branch: 2, name: 'Demo • Thầy Hải Đăng', subject: 'Toán' },
    ];
    const teachers = [];
    for (const [index, spec] of teacherSpecs.entries()) {
      const email = `showcase.teacher.${index + 1}@example.test`;
      const found = await client.query('SELECT id FROM teachers WHERE tenant_id = $1 AND email = $2', [tenantId, email]);
      if (found.rowCount > 1) throw new Error(`teacher ${email}: duplicate rows`);
      const row = found.rowCount ? found.rows[0] : await exactlyOne(client,
        `INSERT INTO teachers (tenant_id, branch_id, full_name, email, specialization)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tenantId, branches[spec.branch], spec.name, email, spec.subject], `teacher ${email}`);
      if (!found.rowCount) count('teachers');
      teachers.push(row.id);
    }

    const subjects = {};
    for (const [code, name] of [['SHOW-ENG', 'Demo • Tiếng Anh'], ['SHOW-STEM', 'Demo • Toán và STEM']]) {
      const found = await client.query('SELECT id FROM subjects WHERE tenant_id = $1 AND code = $2', [tenantId, code]);
      const row = found.rowCount ? found.rows[0] : await exactlyOne(client,
        'INSERT INTO subjects (tenant_id, code, name, description) VALUES ($1, $2, $3, $4) RETURNING id',
        [tenantId, code, name, 'Môn học giả lập để giới thiệu EduSchedule'], `subject ${code}`);
      if (!found.rowCount) count('subjects');
      subjects[code] = row.id;
    }

    const classSpecs = [
      { name: 'Demo • Giao tiếp A1', branch: 0, teacher: 0, room: 1, subject: 'SHOW-ENG', status: 'active' },
      { name: 'Demo • Toán tư duy', branch: 0, teacher: 1, room: 0, subject: 'SHOW-STEM', status: 'active' },
      { name: 'Demo • Giao tiếp B1', branch: 1, teacher: 2, room: 2, subject: 'SHOW-ENG', status: 'active' },
      { name: 'Demo • STEM căn bản', branch: 1, teacher: 3, room: 2, subject: 'SHOW-STEM', status: 'active' },
      { name: 'Demo • Luyện phát âm', branch: 2, teacher: 4, room: 3, subject: 'SHOW-ENG', status: 'active' },
      { name: 'Demo • Toán nâng cao', branch: 2, teacher: 5, room: 3, subject: 'SHOW-STEM', status: 'active' },
      { name: 'Demo • Khóa đã hoàn thành', branch: 0, teacher: 0, room: 1, subject: 'SHOW-ENG', status: 'completed' },
      { name: 'Demo • Lớp sắp mở', branch: 1, teacher: 2, room: 2, subject: 'SHOW-ENG', status: 'pending' },
    ];
    const classes = [];
    for (const spec of classSpecs) {
      const found = await client.query('SELECT id FROM classes WHERE tenant_id = $1 AND name = $2 AND is_deleted = false', [tenantId, spec.name]);
      if (found.rowCount > 1) throw new Error(`class ${spec.name}: duplicate rows`);
      const row = found.rowCount ? found.rows[0] : await exactlyOne(client,
        `INSERT INTO classes (tenant_id, branch_id, subject_id, teacher_id, name, max_capacity, start_date, end_date, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 30,
                 CURRENT_DATE + $6::int, CURRENT_DATE + $7::int, $8,
                 CURRENT_DATE + $9::int) RETURNING id`,
        [tenantId, branches[spec.branch], subjects[spec.subject], teachers[spec.teacher], spec.name,
          spec.status === 'pending' ? 20 : spec.status === 'completed' ? -180 : -120,
          spec.status === 'pending' ? 140 : spec.status === 'completed' ? -20 : 120,
          spec.status, spec.status === 'pending' ? 0 : -120], `class ${spec.name}`);
      if (!found.rowCount) count('classes');
      classes.push({ ...spec, id: row.id, roomId: rooms[spec.room], teacherId: teachers[spec.teacher] });
    }

    const activeClasses = classes.filter(item => item.status === 'active');
    const students = [];
    let number = 0;
    for (let monthIndex = 0; monthIndex < monthCounts.length; monthIndex++) {
      const monthsAgo = monthCounts.length - 1 - monthIndex;
      for (let withinMonth = 0; withinMonth < monthCounts[monthIndex]; withinMonth++) {
        number++;
        const cls = activeClasses[(number - 1) % activeClasses.length];
        const email = `showcase.student.${String(number).padStart(3, '0')}@example.test`;
        const name = `${names[(number - 1) % names.length]} (Demo ${String(number).padStart(3, '0')})`;
        const found = await client.query('SELECT id, full_name FROM students WHERE tenant_id = $1 AND email = $2', [tenantId, email]);
        if (found.rowCount > 1 || (found.rowCount === 1 && found.rows[0].full_name !== name)) throw new Error(`student ${email}: unexpected existing record`);
        const row = found.rowCount ? found.rows[0] : await exactlyOne(client,
          `INSERT INTO students (tenant_id, branch_id, full_name, email, date_of_birth, created_at)
           VALUES ($1, $2, $3, $4, make_date($5, $6, $7),
                   date_trunc('month', CURRENT_DATE) - ($8::int * INTERVAL '1 month') + ($9::int * INTERVAL '1 day') + INTERVAL '10 hours') RETURNING id`,
          [tenantId, branches[cls.branch], name, email, 2010 + number % 6, 1 + number % 12,
            1 + number % 27, monthsAgo, Math.min(withinMonth * 2 + 1, 18)], `student ${email}`);
        if (!found.rowCount) count('students');
        const enrolled = await client.query(
          `INSERT INTO class_students (tenant_id, class_id, student_id, status, enrolled_at)
           SELECT $1, $2, id, 'enrolled', created_at FROM students WHERE id = $3
           ON CONFLICT (class_id, student_id) DO NOTHING`, [tenantId, cls.id, row.id]);
        if (enrolled.rowCount) count('enrollments');
        students.push({ id: row.id, classId: cls.id, number });
      }
    }

    // Seven completed sessions provide one real attendance data point per weekday.
    for (let offset = -6; offset <= 0; offset++) {
      const cls = activeClasses[(offset + 6) % activeClasses.length];
      const found = await client.query(
        `SELECT id FROM schedule_sessions WHERE tenant_id = $1 AND class_id = $2
         AND session_date = CURRENT_DATE + $3::int AND start_time = '09:00' AND notes = $4`,
        [tenantId, cls.id, offset, sessionNote]);
      if (found.rowCount > 1) throw new Error('Duplicate demo sessions');
      const session = found.rowCount ? found.rows[0] : await exactlyOne(client,
        `INSERT INTO schedule_sessions
         (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time, session_type, status, notes, is_notified)
         VALUES ($1, $2, $3, $4, CURRENT_DATE + $5::int, '09:00', '10:30', 'lecture', 'completed', $6, true) RETURNING id`,
        [tenantId, cls.id, cls.roomId, cls.teacherId, offset, sessionNote], 'past session');
      if (!found.rowCount) count('pastSessions');
      const attendance = await client.query(
        `INSERT INTO attendance (tenant_id, session_id, student_id, status, created_at)
         SELECT $1, $2, cs.student_id,
                CASE WHEN row_number() OVER (ORDER BY cs.student_id) % 11 = 0 THEN 'absent'
                     WHEN row_number() OVER (ORDER BY cs.student_id) % 7 = 0 THEN 'late'
                     ELSE 'present' END,
                (CURRENT_DATE + $4::int)::timestamptz + INTERVAL '12 hours'
         FROM class_students cs WHERE cs.class_id = $3 AND cs.status = 'enrolled'
         ON CONFLICT (session_id, student_id) DO NOTHING`, [tenantId, session.id, cls.id, offset]);
      count('attendance', attendance.rowCount);
    }

    // Two nonconflicting sessions per day keep the upcoming schedule useful for demos.
    for (let offset = 1; offset <= 14; offset++) {
      for (let slot = 0; slot < 2; slot++) {
        const cls = activeClasses[(offset * 2 + slot) % activeClasses.length];
        const start = slot === 0 ? '09:00' : '18:00';
        const end = slot === 0 ? '10:30' : '19:30';
        const found = await client.query(
          `SELECT id FROM schedule_sessions WHERE tenant_id = $1 AND class_id = $2
           AND session_date = CURRENT_DATE + $3::int AND start_time = $4 AND notes = $5`,
          [tenantId, cls.id, offset, start, sessionNote]);
        if (found.rowCount > 1) throw new Error('Duplicate future demo sessions');
        if (!found.rowCount) {
          await client.query(
            `INSERT INTO schedule_sessions
             (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time, session_type, status, notes, is_notified)
             VALUES ($1, $2, $3, $4, CURRENT_DATE + $5::int, $6, $7, 'lecture', 'scheduled', $8, true)`,
            [tenantId, cls.id, cls.roomId, cls.teacherId, offset, start, end, sessionNote]);
          count('futureSessions');
        }
      }
    }

    // Current and previous billing periods show paid, partial, and unpaid cases.
    const periods = await client.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM') AS current,
      to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM') AS previous`);
    for (const [index, student] of students.slice(0, 30).entries()) {
      const billingPeriods = index < 18 ? [periods.rows[0].previous, periods.rows[0].current] : [periods.rows[0].current];
      for (const period of billingPeriods) {
        const found = await client.query(
          `SELECT id FROM tuitions WHERE tenant_id = $1 AND student_id = $2 AND class_id = $3
           AND billing_period = $4 AND notes = $5`,
          [tenantId, student.id, student.classId, period, marker]);
        if (found.rowCount > 1) throw new Error('Duplicate demo tuition');
        const amount = 1200000 + (index % 4) * 300000;
        const tuition = found.rowCount ? found.rows[0] : await exactlyOne(client,
          `INSERT INTO tuitions
           (tenant_id, student_id, class_id, billing_cycle, billing_period, amount, discount, due_date, notes, created_at)
           VALUES ($1, $2, $3, 'monthly', $4::text, $5, 0,
                   (to_date($4::text, 'YYYY-MM') + INTERVAL '1 month' - INTERVAL '1 day')::date,
                   $6, to_date($4::text, 'YYYY-MM') + INTERVAL '5 days') RETURNING id`,
          [tenantId, student.id, student.classId, period, amount, marker], 'demo tuition');
        if (!found.rowCount) count('tuitions');
        const paymentType = (index + (period === periods.rows[0].previous ? 1 : 0)) % 3;
        if (paymentType === 2) continue;
        const reference = `PILOT-SHOWCASE-${period}-${String(student.number).padStart(3, '0')}`;
        const existingPayment = await client.query('SELECT id FROM payments WHERE tenant_id = $1 AND tuition_id = $2 AND reference_code = $3', [tenantId, tuition.id, reference]);
        if (!existingPayment.rowCount) {
          await client.query(
            `INSERT INTO payments (tenant_id, tuition_id, amount_paid, payment_date, payment_method, reference_code, notes)
             VALUES ($1, $2, $3, LEAST(CURRENT_DATE, (to_date($4, 'YYYY-MM') + INTERVAL '25 days')::date),
                     'bank_transfer', $5, $6)`,
            [tenantId, tuition.id, paymentType === 0 ? amount : Math.floor(amount / 2), period, reference, marker]);
          count('payments');
        }
      }
    }

    const trends = await client.query(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
       FROM students WHERE tenant_id = $1 AND is_deleted = false
         AND created_at > CURRENT_DATE - INTERVAL '6 months'
       GROUP BY 1 ORDER BY 1`, [tenantId]);
    const attendanceDays = await client.query(
      `SELECT COUNT(DISTINCT s.session_date)::int AS days FROM attendance a
       JOIN schedule_sessions s ON s.id = a.session_id
       WHERE a.tenant_id = $1 AND s.session_date BETWEEN CURRENT_DATE - 6 AND CURRENT_DATE`, [tenantId]);
    if (trends.rowCount < 6 || attendanceDays.rows[0].days !== 7) throw new Error('Dashboard demo charts are incomplete');
    summary.studentTrend = trends.rows;
    summary.attendanceDays = attendanceDays.rows[0].days;
    if (apply) await client.query('COMMIT'); else await client.query('ROLLBACK');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => { console.error('SHOWCASE_SEED_FAILED', error.message); process.exitCode = 1; });

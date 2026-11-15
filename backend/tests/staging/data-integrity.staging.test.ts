import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import PgBoss from 'pg-boss';
import pool from '../../src/db';
import { ClassService } from '../../src/services/class.service';
import { ScheduleService } from '../../src/services/schedule.service';
import { TuitionService } from '../../src/services/tuition.service';
import { AttendanceService } from '../../src/services/attendance.service';
import { StudentService } from '../../src/services/student.service';
import { ImportService } from '../../src/services/import.service';
import { ROLES, VIETNAM_TIME_ZONE } from '../../src/utils/constants';

jest.mock('../../src/db', () => {
  const { Pool } = jest.requireActual<typeof import('pg')>('pg');
  const pool = new Pool({
    connectionString: process.env.PG_INTEGRITY_TEST_URL,
    connectionTimeoutMillis: 5000,
  });
  return {
    __esModule: true,
    default: pool,
    query: (sql: string, params?: unknown[]) => pool.query(sql, params),
  };
});
jest.mock('../../src/services/google.service', () => ({
  syncEventToGoogle: jest.fn(),
  deleteEventFromGoogle: jest.fn(),
}));
jest.mock('../../src/services/email.service', () => ({ sendTeacherWelcomeEmail: jest.fn() }));

const url = process.env.PG_INTEGRITY_TEST_URL;
const describePostgres = url ? describe : describe.skip;
const tenantIds: string[] = [];
const period = '2090-01-02';

async function fixture() {
  const id = randomUUID();
  const tenant = (
    await pool.query(
      "INSERT INTO tenants (name, plan_id) SELECT $1, id FROM plan_definitions WHERE code = 'FREE' RETURNING id",
      [`QA integrity ${id}`]
    )
  ).rows[0].id as string;
  tenantIds.push(tenant);
  const branch = (
    await pool.query("INSERT INTO branches (tenant_id, name) VALUES ($1, 'QA') RETURNING id", [
      tenant,
    ])
  ).rows[0].id as string;
  const teacher = (
    await pool.query(
      "INSERT INTO teachers (tenant_id, branch_id, full_name, email) VALUES ($1, $2, 'QA Teacher', $3) RETURNING id",
      [tenant, branch, `teacher-${id}@example.test`]
    )
  ).rows[0].id as string;
  const room = (
    await pool.query(
      "INSERT INTO rooms (tenant_id, branch_id, name, capacity) VALUES ($1, $2, 'QA room', 30) RETURNING id",
      [tenant, branch]
    )
  ).rows[0].id as string;
  const student = (
    await pool.query(
      "INSERT INTO students (tenant_id, branch_id, full_name, email) VALUES ($1, $2, 'QA Student', $3) RETURNING id",
      [tenant, branch, `student-${id}@example.test`]
    )
  ).rows[0].id as string;
  const user = (
    await pool.query(
      "INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'test-only', 'QA Admin', 'admin') RETURNING id",
      [tenant, `admin-${id}@example.test`]
    )
  ).rows[0].id as string;
  const cls = await ClassService.createClass(tenant, {
    branch_id: branch,
    teacher_id: teacher,
    name: 'QA class',
    start_date: period,
    end_date: period,
  });
  return { tenant, branch, teacher, room, student, user, classId: cls.id as string };
}

describePostgres('data integrity on PostgreSQL', () => {
  let a: Awaited<ReturnType<typeof fixture>>;
  let b: typeof a;

  beforeAll(async () => {
    const target = new URL(url!);
    const database = decodeURIComponent(target.pathname.slice(1));
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
    if (
      process.env.PG_INTEGRITY_CONFIRMATION !== 'isolated-synthetic-staging' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      !(
        database === 'eduschedule_staging' ||
        (loopback && database === 'eduschedule_integrity_test')
      ) ||
      (!loopback && target.searchParams.get('sslmode') !== 'verify-full') ||
      target.searchParams.has('options')
    ) {
      throw new Error(
        'Refusing to write fixtures outside a confirmed isolated PostgreSQL database'
      );
    }
    const { rows } = await pool.query('SELECT current_database() AS name');
    expect(rows[0].name).toBe(database);
    a = await fixture();
    b = await fixture();
  });

  afterAll(async () => {
    try {
      if (tenantIds.length > 0) {
        await pool.query('DELETE FROM schedule_sessions WHERE tenant_id = ANY($1::uuid[])', [
          tenantIds,
        ]);
        await pool.query('DELETE FROM classes WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
        await pool.query('DELETE FROM students WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
        await pool.query('DELETE FROM teachers WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
        await pool.query('DELETE FROM tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
      }
    } finally {
      await pool.end();
    }
  });

  it('checks the rounded amount and serializes simultaneous receipts', async () => {
    const {
      rows: [tuition],
    } = await pool.query(
      'INSERT INTO tuitions (tenant_id, student_id, amount, due_date) VALUES ($1, $2, 100, $3) RETURNING id',
      [a.tenant, a.student, period]
    );
    const pay = (amount_paid: number) =>
      TuitionService.recordPayment(a.tenant, a.user, tuition.id, { amount_paid });
    await expect(
      TuitionService.recordPayment(b.tenant, b.user, tuition.id, { amount_paid: 1 })
    ).rejects.toMatchObject({ errorCode: 'TUITION_NOT_FOUND' });
    await expect(pay(0.004)).rejects.toMatchObject({ errorCode: 'INVALID_AMOUNT' });
    await expect(pay(100.005)).rejects.toMatchObject({ errorCode: 'PAYMENT_EXCEEDS_BALANCE' });
    await expect(pay(40)).resolves.toMatchObject({
      tuition: { amount_paid: '40.00', status: 'partial' },
    });

    const results = await Promise.allSettled([pay(60), pay(60)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toEqual([
      expect.objectContaining({
        value: expect.objectContaining({
          tuition: expect.objectContaining({ amount_paid: '100.00', status: 'paid' }),
        }),
      }),
    ]);
    expect(results.filter((result) => result.status === 'rejected')).toEqual([
      expect.objectContaining({ reason: expect.objectContaining({ errorCode: 'ALREADY_PAID' }) }),
    ]);
    const { rows } = await pool.query(
      'SELECT count(*)::int AS count, sum(amount_paid) AS total FROM payments WHERE tuition_id = $1',
      [tuition.id]
    );
    expect(rows[0]).toEqual({ count: 2, total: '100.00' });
  });

  it('rejects overlapping writes, permits touching slots and frees cancelled slots', async () => {
    const slot = {
      classId: a.classId,
      roomId: a.room,
      teacherId: a.teacher,
      sessionDate: period,
      startTime: '08:00',
      endTime: '09:00',
    };
    const results = await Promise.all([
      ScheduleService.createSession(a.tenant, undefined, slot),
      ScheduleService.createSession(a.tenant, undefined, slot),
    ]);
    const booked = results.find((result) => result.success);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    if (!booked?.data) throw new Error('Expected a booked session');
    expect(results.find((result) => !result.success)?.conflicts).toHaveLength(3);

    // Direct SQL bypasses both the application lock and the early conflict query.
    await expect(
      pool.query(
        `INSERT INTO schedule_sessions (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, '08:30', '09:30')`,
        [a.tenant, a.classId, a.room, a.teacher, period]
      )
    ).rejects.toMatchObject({ code: '23P01' });
    const adjacent = await ScheduleService.createSession(a.tenant, undefined, {
      ...slot,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(adjacent.success).toBe(true);
    if (!adjacent.data) throw new Error('Expected an adjacent session');
    await expect(
      ScheduleService.updateSession(a.tenant, undefined, adjacent.data.id, { startTime: '08:30' })
    ).resolves.toMatchObject({ success: false });
    await expect(
      ScheduleService.createSession(b.tenant, undefined, {
        ...slot,
        classId: b.classId,
        roomId: b.room,
        teacherId: b.teacher,
      })
    ).resolves.toMatchObject({ success: true });
    await ScheduleService.deleteSession(a.tenant, undefined, booked.data.id);
    await expect(ScheduleService.createSession(a.tenant, undefined, slot)).resolves.toMatchObject({
      success: true,
    });
  });

  it('keeps receipts when deleting tuition concurrently and recomputes the status when updating it', async () => {
    const {
      rows: [{ id }],
    } = await pool.query<{ id: string }>(
      'INSERT INTO tuitions (tenant_id, student_id, amount, due_date) VALUES ($1, $2, 100, $3) RETURNING id',
      [a.tenant, a.student, period]
    );
    const pay = (amount_paid: number) =>
      TuitionService.recordPayment(a.tenant, a.user, id, { amount_paid });
    await pay(40);
    await expect(TuitionService.deleteTuition(b.tenant, id)).rejects.toMatchObject({
      errorCode: 'TUITION_NOT_FOUND',
    });
    await expect(TuitionService.updateTuition(b.tenant, id, { amount: 200 })).rejects.toMatchObject(
      { errorCode: 'TUITION_NOT_FOUND' }
    );
    await expect(
      TuitionService.updateTuition(a.tenant, id, { amount: 39.994 })
    ).rejects.toMatchObject({ errorCode: 'TUITION_DUE_BELOW_PAID' });
    await expect(
      TuitionService.updateTuition(a.tenant, id, { status: 'paid' })
    ).rejects.toMatchObject({ errorCode: 'TUITION_STATUS_MISMATCH' });
    await expect(
      TuitionService.updateTuition(a.tenant, id, { discount: 59.996 })
    ).resolves.toMatchObject({ amount_due: '40.00', status: 'paid' });
    await expect(pay(1)).rejects.toMatchObject({ errorCode: 'ALREADY_PAID' });
    await expect(
      TuitionService.updateTuition(a.tenant, id, { discount: 0 })
    ).resolves.toMatchObject({ amount_due: '100.00', status: 'partial' });
    await TuitionService.updateTuition(a.tenant, id, { status: 'waived' });
    await expect(pay(1)).rejects.toMatchObject({ errorCode: 'TUITION_WAIVED' });
    await TuitionService.updateTuition(a.tenant, id, { status: 'partial' });

    const results = await Promise.allSettled([pay(60), TuitionService.deleteTuition(a.tenant, id)]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1]).toMatchObject({ status: 'rejected', reason: { errorCode: 'HAS_PAYMENTS' } });
    const { rows } = await pool.query(
      'SELECT count(*)::int AS count, sum(amount_paid) AS total FROM payments WHERE tenant_id = $1 AND tuition_id = $2',
      [a.tenant, id]
    );
    expect(rows).toEqual([{ count: 2, total: '100.00' }]);

    const {
      rows: [newTuition],
    } = await pool.query<{ id: string }>(
      'INSERT INTO tuitions (tenant_id, student_id, amount, due_date) VALUES ($1, $2, 100, $3) RETURNING id',
      [a.tenant, a.student, period]
    );
    const competing = await Promise.allSettled([
      TuitionService.recordPayment(a.tenant, a.user, newTuition.id, { amount_paid: 100 }),
      TuitionService.deleteTuition(a.tenant, newTuition.id),
    ]);
    expect(competing.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    if (competing[0].status === 'fulfilled') {
      expect(competing[1]).toMatchObject({ reason: { errorCode: 'HAS_PAYMENTS' } });
      expect(await TuitionService.getTuitionPayments(a.tenant, newTuition.id)).toHaveLength(1);
    } else {
      expect(competing[0]).toMatchObject({ reason: { errorCode: 'TUITION_NOT_FOUND' } });
      expect(await TuitionService.getTuitionPayments(a.tenant, newTuition.id)).toHaveLength(0);
    }
  });

  it('keeps concurrent class enrollment changes and serializes competition for the last place', async () => {
    const {
      rows: [{ id: secondStudent }],
    } = await pool.query<{ id: string }>(
      "INSERT INTO students (tenant_id, branch_id, full_name, email) VALUES ($1, $2, 'QA second', $3) RETURNING id",
      [a.tenant, a.branch, `qa-${randomUUID()}@example.test`]
    );
    const update = (add: string[], remove: string[]) =>
      ClassService.updateClass(a.tenant, a.classId, { enrollment_changes: { add, remove } });
    await ClassService.updateClass(a.tenant, a.classId, { max_capacity: 2 });
    await expect(update([b.student], [])).rejects.toMatchObject({
      errorCode: 'INVALID_TENANT_REFERENCE',
    });
    await Promise.all([
      update([a.student], []),
      ClassService.enrollStudent(a.tenant, a.classId, secondStudent, null),
    ]);
    expect(await ClassService.getEnrollments(a.tenant, a.classId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: a.student }),
        expect.objectContaining({ id: secondStudent }),
      ])
    );
    await expect(
      ClassService.updateClass(a.tenant, a.classId, { max_capacity: 1 })
    ).rejects.toMatchObject({ errorCode: 'CAPACITY_EXCEEDED' });
    await update([], [a.student]);
    expect(await ClassService.getEnrollments(a.tenant, a.classId)).toEqual([
      expect.objectContaining({ id: secondStudent }),
    ]);
    await ClassService.updateClass(a.tenant, a.classId, { max_capacity: 1, enrollments: [] });
    const competing = await Promise.allSettled([
      update([a.student], []),
      ClassService.enrollStudent(a.tenant, a.classId, secondStudent, null),
    ]);
    expect(competing.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(competing.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: { errorCode: 'CAPACITY_EXCEEDED' },
    });
    const roster = await ClassService.getEnrollments(a.tenant, a.classId);
    expect(roster).toHaveLength(1);
    await expect(update([roster[0].id], [])).resolves.toMatchObject({ id: a.classId });
  });

  it('scopes attendance to the assigned teacher and permits center admins', async () => {
    const {
      rows: [{ id: assignedUser }],
    } = await pool.query<{ id: string }>(
      "INSERT INTO users (tenant_id, email, password_hash, full_name, role) SELECT tenant_id, email, 'test-only', full_name, $3 FROM teachers WHERE tenant_id = $1 AND id = $2 RETURNING id",
      [a.tenant, a.teacher, ROLES.TEACHER]
    );
    const {
      rows: [{ id: otherUser }],
    } = await pool.query<{ id: string }>(
      "INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'test-only', 'QA other teacher', $3) RETURNING id",
      [a.tenant, `qa-${randomUUID()}@example.test`, ROLES.TEACHER]
    );
    const cls = await ClassService.createClass(a.tenant, {
      name: 'QA attendance',
      branch_id: a.branch,
      teacher_id: a.teacher,
      enrollments: [a.student],
    });
    const {
      rows: [{ today }],
    } = await pool.query<{ today: string }>(
      'SELECT ((CURRENT_TIMESTAMP AT TIME ZONE $1)::date)::text AS today',
      [VIETNAM_TIME_ZONE]
    );
    const result = await ScheduleService.createSession(a.tenant, undefined, {
      classId: cls.id,
      roomId: a.room,
      teacherId: a.teacher,
      sessionDate: today,
      startTime: '18:00',
      endTime: '19:00',
    });
    if (!result.data) throw new Error('Expected a booked session');
    const sessionId = result.data.id;
    const records = [{ student_id: a.student, status: 'present' }];
    const assigned = { userId: assignedUser, role: ROLES.TEACHER };
    const other = { userId: otherUser, role: ROLES.TEACHER };
    const admin = { userId: a.user, role: ROLES.ADMIN };
    await expect(
      AttendanceService.getAttendanceBySession(a.tenant, sessionId, other)
    ).rejects.toMatchObject({ errorCode: 'SESSION_NOT_FOUND' });
    await expect(
      AttendanceService.recordAttendance(a.tenant, sessionId, records, other)
    ).rejects.toMatchObject({ errorCode: 'SESSION_NOT_FOUND' });
    await expect(
      AttendanceService.recordAttendance(b.tenant, sessionId, records, { ...admin, userId: b.user })
    ).rejects.toMatchObject({ errorCode: 'SESSION_NOT_FOUND' });
    await expect(
      AttendanceService.recordAttendance(a.tenant, sessionId, records, assigned)
    ).resolves.toMatchObject({ success: true, count: 1, version: 1, changed: 1 });
    await expect(
      AttendanceService.getAttendanceBySession(a.tenant, sessionId, admin)
    ).resolves.toMatchObject({
      data: { attendance: [expect.objectContaining({ status: 'present' })] },
    });
    await ScheduleService.deleteSession(a.tenant, undefined, sessionId);
    await expect(
      AttendanceService.recordAttendance(a.tenant, sessionId, records, assigned)
    ).rejects.toMatchObject({ errorCode: 'SESSION_DATE_RESTRICTED' });
  });

  it('rolls back conflicting batches and accepts only one concurrent booking', async () => {
    const date = '2090-03-15';
    const slot = {
      classId: a.classId,
      roomId: a.room,
      teacherId: a.teacher,
      sessionDate: date,
      startTime: '08:00',
      endTime: '09:00',
    };
    const list = () =>
      pool.query(
        'SELECT id FROM schedule_sessions WHERE tenant_id = $1 AND class_id = $2 AND session_date = $3',
        [a.tenant, a.classId, date]
      );
    await expect(
      ScheduleService.createSessions(a.tenant, undefined, [
        slot,
        { ...slot, startTime: '08:30', endTime: '09:30' },
      ])
    ).rejects.toMatchObject({
      errorCode: 'SCHEDULE_CONFLICT',
      slot: { index: 1, date, startTime: '08:30', endTime: '09:30' },
    });
    expect((await list()).rows).toHaveLength(0);

    const batch = [slot, { ...slot, startTime: '09:00', endTime: '10:00' }];
    const results = await Promise.allSettled([
      ScheduleService.createSessions(a.tenant, undefined, batch),
      ScheduleService.createSessions(a.tenant, undefined, batch),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: { errorCode: 'SCHEDULE_CONFLICT', slot: { index: 0 } },
    });
    expect((await list()).rows).toHaveLength(2);
    await expect(
      ScheduleService.createSessions(a.tenant, undefined, [{ ...slot, roomId: b.room }])
    ).rejects.toMatchObject({ errorCode: 'INVALID_TENANT_REFERENCE' });
  });

  it('rolls back the whole recurring edit and retains an exact attended session', async () => {
    const date = '2090-02-06';
    const day = String(new Date(date).getUTCDay());
    const recurring = { day_of_week: day, room_id: a.room, start_time: '09:00', end_time: '10:00' };
    const target = await ClassService.createClass(a.tenant, {
      name: 'Recurring QA',
      branch_id: a.branch,
      teacher_id: a.teacher,
      start_date: date,
      end_date: date,
      recurring_schedules: [recurring],
    });
    const list = () =>
      pool.query(
        'SELECT id, start_time FROM schedule_sessions WHERE class_id = $1 ORDER BY start_time',
        [target.id]
      );
    const { rows: initial } = await list();
    expect(initial).toHaveLength(1);
    await pool.query(
      "INSERT INTO attendance (tenant_id, session_id, student_id, status) VALUES ($1, $2, $3, 'present')",
      [a.tenant, initial[0].id, a.student]
    );
    const manual = await ScheduleService.createSession(a.tenant, undefined, {
      classId: target.id,
      roomId: a.room,
      teacherId: a.teacher,
      sessionDate: date,
      startTime: '11:00',
      endTime: '12:00',
    });
    expect(manual.success).toBe(true);
    const second = { ...recurring, start_time: '10:00', end_time: '11:00' };
    await ClassService.updateClass(a.tenant, target.id, {
      recurring_schedules: [recurring, second],
    });
    const { rows: before } = await list();
    expect(before).toHaveLength(3);
    expect(before[0]).toEqual(initial[0]);
    expect(before[2].id).toBe(manual.data?.id);

    await expect(
      ClassService.updateClass(a.tenant, target.id, {
        name: 'Must roll back',
        enrollments: [a.student],
        recurring_schedules: [
          recurring,
          second,
          { ...recurring, start_time: '10:30', end_time: '11:30' },
        ],
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      slot: { date, startTime: '10:30', endTime: '11:30' },
    });
    expect((await list()).rows).toEqual(before);
    expect(
      (await pool.query('SELECT name FROM classes WHERE id = $1', [target.id])).rows[0].name
    ).toBe('Recurring QA');
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS count FROM class_recurring_schedules WHERE class_id = $1',
          [target.id]
        )
      ).rows[0].count
    ).toBe(2);
    expect(
      (await pool.query('SELECT 1 FROM class_students WHERE class_id = $1', [target.id])).rows
    ).toEqual([]);
  });

  it('serializes bulk tuition generation and keeps student-filtered totals consistent', async () => {
    const f = await fixture();
    await ClassService.enrollStudent(f.tenant, f.classId, f.student, null);
    const input = {
      class_id: f.classId,
      amount: 2_000_000,
      due_date: period,
      billing_period: '2090-01',
    };
    const results = await Promise.all([
      TuitionService.bulkGenerateTuitions(f.tenant, f.user, input),
      TuitionService.bulkGenerateTuitions(f.tenant, f.user, input),
    ]);
    expect(results.map((row) => row.created).sort()).toEqual([0, 1]);
    expect(results.map((row) => row.skipped).sort()).toEqual([0, 1]);
    const tuition = results.flatMap((row) => row.tuitions)[0];
    await TuitionService.recordPayment(f.tenant, f.user, tuition.id, { amount_paid: 500_000 });
    const filtered = await TuitionService.getTuitions(f.tenant, { student_id: f.student });
    expect(filtered.summary).toMatchObject({
      total_count: '1',
      total_paid: '500000.00',
      total_outstanding: '1500000.00',
    });
    expect(
      (
        await TuitionService.getTuitions(f.tenant, {
          student_id: f.student,
          class_id: f.classId,
          billing_period: '2090-01',
          status: 'partial',
        })
      ).summary
    ).toEqual(filtered.summary);
    expect(
      (await TuitionService.getTuitions(f.tenant, { status: 'paid' })).summary.total_count
    ).toBe('0');
    expect(
      (await TuitionService.getTuitions(f.tenant, { student_id: b.student })).summary.total_count
    ).toBe('0');
    await expect(
      TuitionService.bulkGenerateTuitions(f.tenant, f.user, { ...input, class_id: b.classId })
    ).rejects.toMatchObject({ errorCode: 'CLASS_NOT_FOUND' });
  });

  it('returns overdue tuitions on repeated reads without mutating them', async () => {
    const f = await fixture();
    const created = await TuitionService.createTuition(f.tenant, f.user, {
      student_id: f.student,
      amount: 100,
      due_date: '2000-01-01',
    });
    await TuitionService.updateTuition(f.tenant, created.id, { notes: 'Set overdue status' });
    const readRow = () =>
      pool.query('SELECT * FROM tuitions WHERE tenant_id = $1 AND id = $2', [f.tenant, created.id]);
    const before = (await readRow()).rows;
    const first = await TuitionService.getOverdueTuitions(f.tenant);
    expect(first).toEqual([expect.objectContaining({ id: created.id, status: 'overdue' })]);
    expect(await TuitionService.getOverdueTuitions(f.tenant)).toEqual(first);
    expect(
      (await TuitionService.getTuitions(f.tenant, { status: 'overdue', student_id: f.student }))
        .summary
    ).toMatchObject({ total_count: '1', total_outstanding: '100.00' });
    expect((await readRow()).rows).toEqual(before);
  });

  it('rolls back an entire student import at capacity and preserves date-of-birth on success', async () => {
    const f = await fixture();
    await ClassService.updateClass(f.tenant, f.classId, {
      max_capacity: 1,
      enrollments: [f.student],
    });
    const row = {
      full_name: 'Imported pupil',
      email: `import-${randomUUID()}@example.test`,
      class_name: 'QA class',
      date_of_birth: '31/12/2008',
    };
    await expect(
      StudentService.bulkImport(f.tenant, { branch_id: f.branch, students: [row] })
    ).rejects.toMatchObject({ errorCode: 'CAPACITY_EXCEEDED' });
    expect(
      (
        await pool.query('SELECT id FROM students WHERE tenant_id = $1 AND email = $2', [
          f.tenant,
          row.email,
        ])
      ).rows
    ).toEqual([]);
    await ClassService.updateClass(f.tenant, f.classId, { max_capacity: 2 });
    await StudentService.bulkImport(f.tenant, { branch_id: f.branch, students: [row] });
    await StudentService.bulkImport(f.tenant, { branch_id: f.branch, students: [row] });
    const imported = (
      await pool.query(
        'SELECT id, date_of_birth::text FROM students WHERE tenant_id = $1 AND email = $2',
        [f.tenant, row.email]
      )
    ).rows;
    expect(imported).toEqual([expect.objectContaining({ date_of_birth: '2008-12-31' })]);
    expect(await ClassService.getEnrollments(f.tenant, f.classId)).toHaveLength(2);
  });

  it('allows only one import to take the last class place', async () => {
    const f = await fixture();
    await ClassService.updateClass(f.tenant, f.classId, { max_capacity: 1 });
    const results = await Promise.allSettled(
      [1, 2].map((index) =>
        StudentService.bulkImport(f.tenant, {
          branch_id: f.branch,
          students: [
            {
              full_name: `Import ${index}`,
              email: `race-${index}-${randomUUID()}@example.test`,
              class_name: 'QA class',
            },
          ],
        })
      )
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { errorCode: 'CAPACITY_EXCEEDED' },
    });
    expect(await ClassService.getEnrollments(f.tenant, f.classId)).toHaveLength(1);
    expect(
      (
        await pool.query('SELECT count(*)::int AS count FROM students WHERE tenant_id = $1', [
          f.tenant,
        ])
      ).rows[0].count
    ).toBe(2);
  });

  it('preserves formatted student details in the generic import and rejects foreign branches', async () => {
    const f = await fixture();
    const row = {
      branch_id: f.branch,
      full_name: 'Imported pupil',
      email: `generic-${randomUUID()}@example.test`,
      phone: '0900123456',
      parent_phone: '0912345678',
      date_of_birth: '31/12/2008',
    };
    expect(await ImportService.importData(f.tenant, 'students', [row])).toMatchObject({
      successCount: 1,
      skipCount: 0,
    });
    expect(
      (
        await pool.query(
          'SELECT phone, parent_phone, date_of_birth::text FROM students WHERE tenant_id = $1 AND email = $2',
          [f.tenant, row.email]
        )
      ).rows
    ).toEqual([{ phone: row.phone, parent_phone: row.parent_phone, date_of_birth: '2008-12-31' }]);
    await expect(
      ImportService.importData(f.tenant, 'students', [{ ...row, branch_id: b.branch }])
    ).rejects.toMatchObject({ errorCode: 'INVALID_TENANT_REFERENCE' });
  });

  it('imports classes without a nonexistent conflict constraint and skips duplicates concurrently', async () => {
    const f = await fixture();
    const teacherEmail = (
      await pool.query('SELECT email FROM teachers WHERE tenant_id = $1 AND id = $2', [
        f.tenant,
        f.teacher,
      ])
    ).rows[0].email;
    const row = {
      branch_id: f.branch,
      name: 'Imported class',
      teacher_email: teacherEmail,
      max_capacity: 20,
      start_date: '15/11/2026',
      end_date: '15/12/2026',
    };
    const results = await Promise.all([
      ImportService.importData(f.tenant, 'classes', [row]),
      ImportService.importData(f.tenant, 'classes', [row]),
    ]);
    expect(results.map((result) => result.successCount).sort()).toEqual([0, 1]);
    expect(results.map((result) => result.skipCount).sort()).toEqual([0, 1]);
    expect(
      (
        await pool.query(
          'SELECT start_date::text, end_date::text FROM classes WHERE tenant_id = $1 AND name = $2',
          [f.tenant, row.name]
        )
      ).rows
    ).toEqual([{ start_date: '2026-11-15', end_date: '2026-12-15' }]);
    await expect(
      ImportService.importData(f.tenant, 'classes', [{ ...row, branch_id: b.branch }])
    ).rejects.toMatchObject({ errorCode: 'INVALID_TENANT_REFERENCE' });
    expect(
      await ImportService.importData(f.tenant, 'classes', [
        { ...row, name: 'Invalid dates', start_date: '31/02/2026' },
      ])
    ).toMatchObject({ successCount: 0, skipCount: 1 });
  });

  it('runs the existing job queue with the patched UUID dependency', async () => {
    const queue = new PgBoss({ connectionString: url!, schema: 'qa_dependency_jobs' });
    const errors: Error[] = [];
    queue.on('error', (error: Error) => errors.push(error));
    try {
      await queue.start();
      const jobId = await queue.send('qa-dependency-smoke', { marker: 'synthetic' });
      expect(jobId).toMatch(/^[0-9a-f-]{36}$/i);
      const job = await queue.fetch<{ marker: string }>('qa-dependency-smoke');
      expect(job).toMatchObject({ id: jobId, data: { marker: 'synthetic' } });
      await queue.complete(job!.id);
      expect(await queue.fetch('qa-dependency-smoke')).toBeNull();
      expect(errors).toEqual([]);
    } finally {
      // pg-boss 9 closes its pool only when destroy is explicitly requested.
      await queue.stop({ graceful: false, destroy: true });
      // The outer suite refuses all writes unless this is a confirmed synthetic DB.
      await pool.query('DROP SCHEMA IF EXISTS qa_dependency_jobs CASCADE');
    }
  });

  it('reports existing overlap IDs and leaves those rows intact when migration stops', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'CREATE TEMP TABLE schedule_sessions (LIKE public.schedule_sessions INCLUDING DEFAULTS)'
      );
      const {
        rows: [first, second],
      } = await client.query(
        `INSERT INTO schedule_sessions (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, '08:00', '09:00'), ($1, $2, $3, $4, $5, '08:30', '09:30') RETURNING id`,
        [a.tenant, a.classId, a.room, a.teacher, period]
      );
      await client.query('SAVEPOINT before_migration');
      const migration = readFileSync(
        resolve(__dirname, '../../src/migrations/20261108_schedule_exclusion.sql'),
        'utf8'
      );
      await expect(client.query(migration)).rejects.toThrow(
        `Overlapping schedule sessions: ${[first.id, second.id].sort().join(' and ')}`
      );
      await client.query('ROLLBACK TO SAVEPOINT before_migration');
      expect((await client.query('SELECT id FROM schedule_sessions')).rows).toHaveLength(2);
      await client.query('DELETE FROM schedule_sessions WHERE id = $1', [second.id]);
      await client.query(migration);
      expect((await client.query('SELECT id FROM schedule_sessions')).rows).toEqual([first]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});

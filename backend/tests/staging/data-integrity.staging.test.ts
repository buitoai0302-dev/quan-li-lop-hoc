import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pool from '../../src/db';
import { ClassService } from '../../src/services/class.service';
import { ScheduleService } from '../../src/services/schedule.service';
import { TuitionService } from '../../src/services/tuition.service';

jest.mock('../../src/db', () => {
  const { Pool } = jest.requireActual<typeof import('pg')>('pg');
  const pool = new Pool({ connectionString: process.env.PG_INTEGRITY_TEST_URL, connectionTimeoutMillis: 5000 });
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

const url = process.env.PG_INTEGRITY_TEST_URL;
const describePostgres = url ? describe : describe.skip;
const tenantIds: string[] = [];
const period = '2090-01-02';

async function fixture() {
  const id = randomUUID();
  const tenant = (await pool.query(
    "INSERT INTO tenants (name, plan_id) SELECT $1, id FROM plan_definitions WHERE code = 'FREE' RETURNING id",
    [`QA integrity ${id}`]
  )).rows[0].id as string;
  tenantIds.push(tenant);
  const branch = (await pool.query(
    "INSERT INTO branches (tenant_id, name) VALUES ($1, 'QA') RETURNING id", [tenant]
  )).rows[0].id as string;
  const teacher = (await pool.query(
    "INSERT INTO teachers (tenant_id, branch_id, full_name, email) VALUES ($1, $2, 'QA Teacher', $3) RETURNING id",
    [tenant, branch, `teacher-${id}@example.test`]
  )).rows[0].id as string;
  const room = (await pool.query(
    "INSERT INTO rooms (tenant_id, branch_id, name, capacity) VALUES ($1, $2, 'QA room', 30) RETURNING id",
    [tenant, branch]
  )).rows[0].id as string;
  const student = (await pool.query(
    "INSERT INTO students (tenant_id, branch_id, full_name, email) VALUES ($1, $2, 'QA Student', $3) RETURNING id",
    [tenant, branch, `student-${id}@example.test`]
  )).rows[0].id as string;
  const user = (await pool.query(
    "INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'test-only', 'QA Admin', 'admin') RETURNING id",
    [tenant, `admin-${id}@example.test`]
  )).rows[0].id as string;
  const cls = await ClassService.createClass(tenant, {
    branch_id: branch, teacher_id: teacher, name: 'QA class', start_date: period, end_date: period,
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
    if (process.env.PG_INTEGRITY_CONFIRMATION !== 'isolated-synthetic-staging' ||
        !['postgres:', 'postgresql:'].includes(target.protocol) ||
        !(database === 'eduschedule_staging' || (loopback && database === 'eduschedule_integrity_test')) ||
        (!loopback && target.searchParams.get('sslmode') !== 'verify-full') ||
        target.searchParams.has('options')) {
      throw new Error('Refusing to write fixtures outside a confirmed isolated PostgreSQL database');
    }
    const { rows } = await pool.query('SELECT current_database() AS name');
    expect(rows[0].name).toBe(database);
    a = await fixture();
    b = await fixture();
  });

  afterAll(async () => {
    try {
      if (tenantIds.length > 0) {
        await pool.query('DELETE FROM schedule_sessions WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
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
    const { rows: [tuition] } = await pool.query(
      'INSERT INTO tuitions (tenant_id, student_id, amount, due_date) VALUES ($1, $2, 100, $3) RETURNING id',
      [a.tenant, a.student, period]
    );
    const pay = (amount_paid: number) => TuitionService.recordPayment(
      a.tenant, a.user, tuition.id, { amount_paid }
    );
    await expect(TuitionService.recordPayment(b.tenant, b.user, tuition.id, { amount_paid: 1 }))
      .rejects.toMatchObject({ errorCode: 'TUITION_NOT_FOUND' });
    await expect(pay(0.004)).rejects.toMatchObject({ errorCode: 'INVALID_AMOUNT' });
    await expect(pay(100.005)).rejects.toMatchObject({ errorCode: 'PAYMENT_EXCEEDS_BALANCE' });
    await expect(pay(40)).resolves.toMatchObject({ tuition: { amount_paid: '40.00', status: 'partial' } });

    const results = await Promise.allSettled([pay(60), pay(60)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toEqual([
      expect.objectContaining({ value: expect.objectContaining({
        tuition: expect.objectContaining({ amount_paid: '100.00', status: 'paid' }),
      }) }),
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
      classId: a.classId, roomId: a.room, teacherId: a.teacher,
      sessionDate: period, startTime: '08:00', endTime: '09:00',
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
    await expect(pool.query(
      `INSERT INTO schedule_sessions (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, '08:30', '09:30')`,
      [a.tenant, a.classId, a.room, a.teacher, period]
    )).rejects.toMatchObject({ code: '23P01' });
    const adjacent = await ScheduleService.createSession(a.tenant, undefined, {
      ...slot, startTime: '09:00', endTime: '10:00',
    });
    expect(adjacent.success).toBe(true);
    if (!adjacent.data) throw new Error('Expected an adjacent session');
    await expect(ScheduleService.updateSession(a.tenant, undefined, adjacent.data.id, { startTime: '08:30' }))
      .resolves.toMatchObject({ success: false });
    await expect(ScheduleService.createSession(b.tenant, undefined, {
      ...slot, classId: b.classId, roomId: b.room, teacherId: b.teacher,
    })).resolves.toMatchObject({ success: true });
    await ScheduleService.deleteSession(a.tenant, undefined, booked.data.id);
    await expect(ScheduleService.createSession(a.tenant, undefined, slot))
      .resolves.toMatchObject({ success: true });
  });

  it('rolls back the whole recurring edit and retains an exact attended session', async () => {
    const date = '2090-02-06';
    const day = String(new Date(date).getUTCDay());
    const recurring = { day_of_week: day, room_id: a.room, start_time: '09:00', end_time: '10:00' };
    const target = await ClassService.createClass(a.tenant, {
      name: 'Recurring QA', branch_id: a.branch, teacher_id: a.teacher, start_date: date, end_date: date,
      recurring_schedules: [recurring],
    });
    const list = () => pool.query(
      'SELECT id, start_time FROM schedule_sessions WHERE class_id = $1 ORDER BY start_time', [target.id]
    );
    const { rows: initial } = await list();
    expect(initial).toHaveLength(1);
    await pool.query(
      "INSERT INTO attendance (tenant_id, session_id, student_id, status) VALUES ($1, $2, $3, 'present')",
      [a.tenant, initial[0].id, a.student]
    );
    const manual = await ScheduleService.createSession(a.tenant, undefined, {
      classId: target.id, roomId: a.room, teacherId: a.teacher,
      sessionDate: date, startTime: '11:00', endTime: '12:00',
    });
    expect(manual.success).toBe(true);
    const second = { ...recurring, start_time: '10:00', end_time: '11:00' };
    await ClassService.updateClass(a.tenant, target.id, { recurring_schedules: [recurring, second] });
    const { rows: before } = await list();
    expect(before).toHaveLength(3);
    expect(before[0]).toEqual(initial[0]);
    expect(before[2].id).toBe(manual.data?.id);

    await expect(ClassService.updateClass(a.tenant, target.id, {
      name: 'Must roll back',
      enrollments: [a.student],
      recurring_schedules: [
        recurring, second, { ...recurring, start_time: '10:30', end_time: '11:30' },
      ],
    })).rejects.toMatchObject({
      statusCode: 409, slot: { date, startTime: '10:30', endTime: '11:30' },
    });
    expect((await list()).rows).toEqual(before);
    expect((await pool.query('SELECT name FROM classes WHERE id = $1', [target.id])).rows[0].name)
      .toBe('Recurring QA');
    expect((await pool.query('SELECT count(*)::int AS count FROM class_recurring_schedules WHERE class_id = $1',
      [target.id])).rows[0].count).toBe(2);
    expect((await pool.query('SELECT 1 FROM class_students WHERE class_id = $1', [target.id])).rows).toEqual([]);
  });

  it('reports existing overlap IDs and leaves those rows intact when migration stops', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('CREATE TEMP TABLE schedule_sessions (LIKE public.schedule_sessions INCLUDING DEFAULTS)');
      const { rows: [first, second] } = await client.query(
        `INSERT INTO schedule_sessions (tenant_id, class_id, room_id, teacher_id, session_date, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, '08:00', '09:00'), ($1, $2, $3, $4, $5, '08:30', '09:30') RETURNING id`,
        [a.tenant, a.classId, a.room, a.teacher, period]
      );
      await client.query('SAVEPOINT before_migration');
      const migration = readFileSync(resolve(__dirname, '../../src/migrations/20261108_schedule_exclusion.sql'), 'utf8');
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

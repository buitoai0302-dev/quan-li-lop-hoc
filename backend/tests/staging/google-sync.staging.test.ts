import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import PgBoss from 'pg-boss';
import pool from '../../src/db';
import { GoogleSyncService } from '../../src/services/google-sync.service';
import { getPersonalCalendar } from '../../src/services/google-calendar-provider.service';
import { ClassService } from '../../src/services/class.service';
import { ScheduleService } from '../../src/services/schedule.service';
import { initGoogleSyncJobs } from '../../src/cron/google-sync.cron';

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
jest.mock('../../src/services/google-calendar-provider.service', () => ({
  ...jest.requireActual('../../src/services/google-calendar-provider.service'),
  getPersonalCalendar: jest.fn(),
}));
jest.mock('../../src/cron/queue', () => ({ __esModule: true, default: {} }));
const describePostgres = process.env.PG_INTEGRITY_TEST_URL ? describe : describe.skip;
const tenantIds: string[] = [];
const events = new Map<string, Record<string, unknown>>();
const insert = jest.fn();
const patch = jest.fn();
const remove = jest.fn();
const get = jest.fn();
let failInsert: unknown;
let failGet: unknown;
let failPatch: unknown;
let delayInsert = false;
async function waitUntil(predicate: () => Promise<boolean> | boolean) {
  const deadline = Date.now() + 10000;
  while (!(await predicate())) {
    if (Date.now() > deadline) throw new Error('Fixture timed out');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
async function fixture(connected = true) {
  const email = `qa-${randomUUID()}@example.test`;
  const tenantId = (
    await pool.query(
      "INSERT INTO tenants(name,plan_id) SELECT 'Sync QA',id FROM plan_definitions WHERE code='FREE' RETURNING id"
    )
  ).rows[0].id as string;
  tenantIds.push(tenantId);
  const branchId = (
    await pool.query("INSERT INTO branches(tenant_id,name) VALUES ($1,'QA') RETURNING id", [
      tenantId,
    ])
  ).rows[0].id;
  const userId = (
    await pool.query(
      "INSERT INTO users(tenant_id,email,password_hash,full_name,role,google_access_token) VALUES ($1,$2,'synthetic-only','QA','admin',$3) RETURNING id",
      [tenantId, email, connected ? 'synthetic-' + email : null]
    )
  ).rows[0].id as string;
  const teacherId = (
    await pool.query(
      "INSERT INTO teachers(tenant_id,branch_id,email,full_name) VALUES ($1,$2,$3,'QA') RETURNING id",
      [tenantId, branchId, email]
    )
  ).rows[0].id;
  const roomId = (
    await pool.query(
      "INSERT INTO rooms(tenant_id,branch_id,name,capacity) VALUES ($1,$2,'QA',30) RETURNING id",
      [tenantId, branchId]
    )
  ).rows[0].id;
  const subjectId = (
    await pool.query(
      "INSERT INTO subjects(tenant_id,name,code) VALUES ($1,'QA','QA') RETURNING id",
      [tenantId]
    )
  ).rows[0].id;
  const classId = (
    await pool.query(
      "INSERT INTO classes(tenant_id,branch_id,teacher_id,subject_id,name,max_capacity,start_date,end_date) VALUES ($1,$2,$3,$4,'QA',30,CURRENT_DATE,CURRENT_DATE+30) RETURNING id",
      [tenantId, branchId, teacherId, subjectId]
    )
  ).rows[0].id;
  const sessionId = (
    await pool.query(
      "INSERT INTO schedule_sessions(tenant_id,class_id,teacher_id,room_id,session_date,start_time,end_time) VALUES ($1,$2,$3,$4,CURRENT_DATE,'08:00','09:00') RETURNING id",
      [tenantId, classId, teacherId, roomId]
    )
  ).rows[0].id;
  const linkId = (
    await pool.query(
      'SELECT id FROM google_calendar_links WHERE tenant_id=$1 AND user_id=$2 AND session_id=$3',
      [tenantId, userId, sessionId]
    )
  ).rows[0]?.id as string | undefined;
  return {
    tenantId,
    userId,
    teacherId,
    roomId,
    classId,
    sessionId,
    linkId: linkId!,
    email,
    branchId,
  };
}
async function state(f: { tenantId: string; linkId: string }) {
  return (
    await pool.query('SELECT * FROM google_sync_outbox WHERE tenant_id=$1 AND link_id=$2', [
      f.tenantId,
      f.linkId,
    ])
  ).rows[0];
}
describePostgres('durable personal Google calendar sync', () => {
  beforeAll(async () => {
    const url = new URL(process.env.PG_INTEGRITY_TEST_URL!);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      process.env.PG_INTEGRITY_CONFIRMATION !== 'isolated-synthetic-staging' ||
      url.searchParams.has('options') ||
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !(
        (local && url.pathname === '/eduschedule_integrity_test') ||
        (url.pathname === '/eduschedule_staging' &&
          (local || url.searchParams.get('sslmode') === 'verify-full'))
      )
    )
      throw Error('Isolated synthetic PostgreSQL required');
    expect((await pool.query('SELECT current_database() AS name')).rows[0].name).toBe(
      url.pathname.slice(1)
    );
  });
  beforeEach(() => {
    events.clear();
    insert.mockReset();
    patch.mockReset();
    remove.mockReset();
    get.mockReset();
    failInsert = null;
    failGet = null;
    failPatch = null;
    delayInsert = false;
    delete process.env.DISABLE_BACKGROUND_JOBS;
    process.env.GOOGLE_CALENDAR_SYNC_JOBS_ENABLED = 'true';
    jest.mocked(getPersonalCalendar).mockImplementation(
      (accessToken) =>
        ({
          events: {
            get: async ({ eventId }: { eventId: string }) => {
              get(eventId);
              if (failGet) throw failGet;
              const event = events.get(`${accessToken}:${eventId}`);
              if (!event) throw { code: 404 };
              return { data: event };
            },
            insert: async ({ requestBody }: { requestBody: { id: string } }) => {
              insert(requestBody);
              if (delayInsert) await new Promise((resolve) => setTimeout(resolve, 80));
              const key = `${accessToken}:${requestBody.id}`;
              if (events.has(key)) throw { code: 409 };
              events.set(key, requestBody);
              if (failInsert) throw failInsert;
              return { data: requestBody };
            },
            patch: async ({
              eventId,
              requestBody,
            }: {
              eventId: string;
              requestBody: Record<string, unknown>;
            }) => {
              patch(eventId, requestBody);
              const key = `${accessToken}:${eventId}`;
              events.set(key, { ...events.get(key), ...requestBody });
              if (failPatch) throw failPatch;
              return { data: events.get(key) };
            },
            delete: async ({ eventId }: { eventId: string }) => {
              remove(eventId);
              events.delete(`${accessToken}:${eventId}`);
              return {};
            },
          },
        }) as unknown as ReturnType<typeof getPersonalCalendar>
    );
  });
  afterEach(async () => {
    if (tenantIds.length) {
      await pool.query('DELETE FROM schedule_sessions WHERE tenant_id=ANY($1::uuid[])', [
        tenantIds,
      ]);
      await pool.query('DELETE FROM classes WHERE tenant_id=ANY($1::uuid[])', [tenantIds]);
      await pool.query('DELETE FROM students WHERE tenant_id=ANY($1::uuid[])', [tenantIds]);
      await pool.query('DELETE FROM teachers WHERE tenant_id=ANY($1::uuid[])', [tenantIds]);
      await pool.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])', [tenantIds]);
      tenantIds.length = 0;
    }
  });
  afterAll(async () => {
    await pool.end();
  });
  it('queues atomically, rolls back outbox changes, and survives hard deletion', async () => {
    const f = await fixture();
    expect((await state(f)).state).toBe('pending');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "UPDATE schedule_sessions SET notes='rolled back' WHERE tenant_id=$1 AND id=$2",
        [f.tenantId, f.sessionId]
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    expect((await state(f)).revision).toBe('1');
    await GoogleSyncService.processLink(f.linkId);
    expect((await state(f)).state).toBe('synced');
    await pool.query('DELETE FROM schedule_sessions WHERE tenant_id=$1 AND id=$2', [
      f.tenantId,
      f.sessionId,
    ]);
    expect((await state(f)).operation).toBe('delete');
    await GoogleSyncService.processLink(f.linkId);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(events.size).toBe(0);
  });
  it('recovers a lost insert response and duplicate worker attempts without duplicate events', async () => {
    const f = await fixture();
    failInsert = { code: 'ECONNRESET' };
    await GoogleSyncService.processLink(f.linkId);
    expect((await state(f)).state).toBe('retry_needed');
    expect(events.size).toBe(1);
    failInsert = null;
    await pool.query(
      'UPDATE google_sync_outbox SET next_attempt_at=now() WHERE tenant_id=$1 AND link_id=$2',
      [f.tenantId, f.linkId]
    );
    await Promise.all([
      GoogleSyncService.processLink(f.linkId),
      GoogleSyncService.processLink(f.linkId),
    ]);
    expect(insert).toHaveBeenCalledTimes(1);
    expect((await state(f)).state).toBe('synced');
    const g = await fixture();
    delayInsert = true;
    await Promise.all([
      GoogleSyncService.processLink(g.linkId),
      GoogleSyncService.processLink(g.linkId),
    ]);
    expect(insert).toHaveBeenCalledTimes(2);
  });
  it('reclaims syncing work after restart and never acknowledges an outdated revision', async () => {
    const f = await fixture();
    await pool.query(
      "UPDATE google_sync_outbox SET state='syncing' WHERE tenant_id=$1 AND link_id=$2",
      [f.tenantId, f.linkId]
    );
    delayInsert = true;
    const running = GoogleSyncService.processLink(f.linkId);
    await waitUntil(() => insert.mock.calls.length > 0);
    await pool.query(
      "UPDATE schedule_sessions SET start_time='10:00',end_time='11:00' WHERE tenant_id=$1 AND id=$2",
      [f.tenantId, f.sessionId]
    );
    await running;
    expect((await state(f)).state).toBe('pending');
    await GoogleSyncService.processLink(f.linkId);
    expect(patch.mock.calls[patch.mock.calls.length - 1]?.[1].start.dateTime).toContain(
      '10:00:00+07:00'
    );
    expect(events.size).toBe(1);
  });
  it('bounds retries, stops permanent failures, and requires reconnection for invalid auth', async () => {
    const f = await fixture();
    failGet = { response: { status: 429 } };
    for (let attempt = 1; attempt <= 6; attempt++) {
      await GoogleSyncService.processLink(f.linkId);
      const row = await state(f);
      expect(row.attempts).toBe(attempt);
      expect(Boolean(row.next_attempt_at)).toBe(attempt <= 5);
      if (attempt <= 5)
        await pool.query(
          'UPDATE google_sync_outbox SET next_attempt_at=now() WHERE tenant_id=$1 AND link_id=$2',
          [f.tenantId, f.linkId]
        );
    }
    const g = await fixture();
    failGet = { code: 400 };
    await GoogleSyncService.processLink(g.linkId);
    expect((await state(g)).next_attempt_at).toBeNull();
    const h = await fixture();
    failGet = { response: { status: 400, data: { error: 'invalid_grant' } } };
    await GoogleSyncService.processLink(h.linkId);
    expect((await state(h)).state).toBe('connection_required');
  });
  it('isolates users and tenants, persists idempotent jobs and pauses disabled workers', async () => {
    const f = await fixture();
    const g = await fixture();
    const key = randomUUID();
    const [a, b] = await Promise.all([
      GoogleSyncService.createJob(f.tenantId, f.userId, key),
      GoogleSyncService.createJob(f.tenantId, f.userId, key),
    ]);
    expect(a.id).toBe(b.id);
    await expect(GoogleSyncService.progress(g.tenantId, g.userId, a.id)).rejects.toMatchObject({
      errorCode: 'NOT_FOUND',
    });
    await expect(GoogleSyncService.retry(f.tenantId, g.userId, a.id)).rejects.toMatchObject({
      errorCode: 'NOT_FOUND',
    });
    delete process.env.GOOGLE_CALENDAR_SYNC_JOBS_ENABLED;
    await expect(GoogleSyncService.processPending()).resolves.toBe(false);
    await GoogleSyncService.processLink(f.linkId);
    expect(insert).not.toHaveBeenCalled();
    expect((await GoogleSyncService.progress(f.tenantId, f.userId, a.id)).paused).toBe(true);
    process.env.GOOGLE_CALENDAR_SYNC_JOBS_ENABLED = 'true';
    process.env.DISABLE_BACKGROUND_JOBS = 'true';
    await GoogleSyncService.processLink(f.linkId);
    expect(insert).not.toHaveBeenCalled();
    expect((await GoogleSyncService.progress(f.tenantId, f.userId, a.id)).paused).toBe(true);
    delete process.env.DISABLE_BACKGROUND_JOBS;
  });
  it('revalidates recipients, cleans up reassigned teachers, and invalidates old connections', async () => {
    const f = await fixture();
    await pool.query("UPDATE users SET role='teacher' WHERE tenant_id=$1 AND id=$2", [
      f.tenantId,
      f.userId,
    ]);
    await GoogleSyncService.processLink(f.linkId);
    const other = (
      await pool.query(
        "INSERT INTO teachers(tenant_id,branch_id,email,full_name) VALUES ($1,$2,$3,'Other') RETURNING id",
        [f.tenantId, f.branchId, `other-${f.email}`]
      )
    ).rows[0].id;
    await pool.query('UPDATE schedule_sessions SET teacher_id=$3 WHERE tenant_id=$1 AND id=$2', [
      f.tenantId,
      f.sessionId,
      other,
    ]);
    expect((await state(f)).operation).toBe('delete');
    await GoogleSyncService.processLink(f.linkId);
    expect(events.size).toBe(0);
    await pool.query(
      "UPDATE users SET role='admin',google_access_token='new-synthetic-connection' WHERE tenant_id=$1 AND id=$2",
      [f.tenantId, f.userId]
    );
    const row = await state(f);
    expect(row.connection_version).toBe(1);
    await GoogleSyncService.processLink(f.linkId);
    expect((await state(f)).state).toBe('synced');
    await pool.query(
      'UPDATE users SET google_access_token=NULL,google_refresh_token=NULL WHERE tenant_id=$1 AND id=$2',
      [f.tenantId, f.userId]
    );
    await GoogleSyncService.processLink(f.linkId);
    expect((await state(f)).state).toBe('connection_required');
  });
  it('requires explicit confirmation for legacy ownership and preserves ambiguous events', async () => {
    const f = await fixture();
    await pool.query(
      "UPDATE google_calendar_links SET legacy_event_id='legacy' WHERE tenant_id=$1 AND id=$2",
      [f.tenantId, f.linkId]
    );
    const token = `synthetic-${f.email}`;
    events.set(`${token}:legacy`, { id: 'legacy', organizer: { self: false } });
    await GoogleSyncService.processLink(f.linkId);
    expect((await state(f)).state).toBe('confirmation_required');
    expect(patch).not.toHaveBeenCalled();
    const job = await GoogleSyncService.createJob(f.tenantId, f.userId);
    await GoogleSyncService.retry(f.tenantId, f.userId, job.id, true);
    await GoogleSyncService.processLink(f.linkId);
    expect(events.has(`${token}:legacy`)).toBe(true);
    expect(events.size).toBe(2);
    expect((await state(f)).state).toBe('synced');
  });
  it('keeps cancellation/reactivation idempotent and replaces Google deletion tombstones', async () => {
    const f = await fixture();
    await GoogleSyncService.processLink(f.linkId);
    const original = insert.mock.calls[0][0].id;
    await pool.query(
      "UPDATE schedule_sessions SET status='cancelled' WHERE tenant_id=$1 AND id=$2",
      [f.tenantId, f.sessionId]
    );
    await GoogleSyncService.processLink(f.linkId);
    await pool.query(
      "UPDATE schedule_sessions SET status='scheduled' WHERE tenant_id=$1 AND id=$2",
      [f.tenantId, f.sessionId]
    );
    await GoogleSyncService.processLink(f.linkId);
    const replacement = insert.mock.calls[1][0].id;
    expect(replacement).not.toBe(original);
    expect(events.size).toBe(1);
    events.set(`synthetic-${f.email}:${replacement}`, { id: replacement, status: 'cancelled' });
    await GoogleSyncService.createJob(f.tenantId, f.userId);
    await GoogleSyncService.processLink(f.linkId);
    expect((await state(f)).state).toBe('pending');
    await GoogleSyncService.processLink(f.linkId);
    expect(insert.mock.calls[2][0].id).not.toBe(replacement);
    expect((await state(f)).state).toBe('synced');
  });
  it('adopts only explicitly confirmed personal legacy events, including a lost patch response', async () => {
    const f = await fixture();
    const key = `synthetic-${f.email}:legacy`;
    await pool.query(
      "UPDATE google_calendar_links SET legacy_event_id='legacy' WHERE tenant_id=$1 AND id=$2",
      [f.tenantId, f.linkId]
    );
    events.set(key, { id: 'legacy', organizer: { self: true }, creator: { self: true } });
    await GoogleSyncService.processLink(f.linkId);
    await GoogleSyncService.retry(f.tenantId, f.userId, undefined, true);
    failPatch = { code: 'ECONNRESET' };
    await GoogleSyncService.processLink(f.linkId);
    expect((await state(f)).state).toBe('retry_needed');
    failPatch = null;
    await GoogleSyncService.retry(f.tenantId, f.userId);
    await GoogleSyncService.processLink(f.linkId);
    expect(events.size).toBe(1);
    expect(insert).not.toHaveBeenCalled();
    expect((await state(f)).state).toBe('synced');
    const g = await fixture();
    const foreign = {
      id: 'legacy',
      organizer: { self: true },
      creator: { self: true },
      extendedProperties: { private: { eduUser: 'someone-else' } },
    };
    events.set(`synthetic-${g.email}:legacy`, foreign);
    await pool.query(
      "UPDATE google_calendar_links SET legacy_event_id='legacy' WHERE tenant_id=$1 AND id=$2",
      [g.tenantId, g.linkId]
    );
    await GoogleSyncService.processLink(g.linkId);
    await GoogleSyncService.retry(g.tenantId, g.userId, undefined, true);
    await GoogleSyncService.processLink(g.linkId);
    expect(events.get(`synthetic-${g.email}:legacy`)).toEqual(foreign);
    expect((await state(g)).state).toBe('synced');
  });
  it('queues bulk and recurring saves atomically, including regeneration deletions', async () => {
    const f = await fixture();
    const slot = {
      classId: f.classId,
      teacherId: f.teacherId,
      roomId: f.roomId,
      sessionDate: '2090-01-02',
      startTime: '08:00',
      endTime: '09:00',
    };
    await expect(
      ScheduleService.createSessions(f.tenantId, f.userId, [slot, slot])
    ).rejects.toMatchObject({ errorCode: 'SCHEDULE_CONFLICT' });
    expect(
      (await pool.query('SELECT id FROM google_calendar_links WHERE tenant_id=$1', [f.tenantId]))
        .rowCount
    ).toBe(1);
    await ScheduleService.createSessions(f.tenantId, f.userId, [
      slot,
      { ...slot, startTime: '09:00', endTime: '10:00' },
    ]);
    expect(
      (await pool.query('SELECT id FROM google_calendar_links WHERE tenant_id=$1', [f.tenantId]))
        .rowCount
    ).toBe(3);
    const date = '2090-02-06';
    const recurring = {
      day_of_week: String(new Date(date).getUTCDay()),
      room_id: f.roomId,
      start_time: '09:00',
      end_time: '10:00',
    };
    const cls = await ClassService.createClass(f.tenantId, {
      name: 'Recurring',
      branch_id: f.branchId,
      teacher_id: f.teacherId,
      start_date: date,
      end_date: date,
      recurring_schedules: [recurring],
    });
    const before = (
      await pool.query(
        'SELECT o.* FROM google_sync_outbox o WHERE o.tenant_id=$1 ORDER BY link_id',
        [f.tenantId]
      )
    ).rows;
    await expect(
      ClassService.updateClass(f.tenantId, cls.id, {
        name: 'Rollback',
        recurring_schedules: [recurring, recurring],
      })
    ).rejects.toMatchObject({ errorCode: 'SCHEDULE_CONFLICT' });
    expect(
      (
        await pool.query(
          'SELECT o.* FROM google_sync_outbox o WHERE o.tenant_id=$1 ORDER BY link_id',
          [f.tenantId]
        )
      ).rows
    ).toEqual(before);
    await ClassService.updateClass(f.tenantId, cls.id, {
      recurring_schedules: [{ ...recurring, start_time: '10:00', end_time: '11:00' }],
    });
    expect(
      (
        await pool.query(
          "SELECT operation FROM google_sync_outbox WHERE tenant_id=$1 AND operation='delete'",
          [f.tenantId]
        )
      ).rowCount
    ).toBe(1);
    expect(
      (
        await pool.query(
          "SELECT operation FROM google_sync_outbox WHERE tenant_id=$1 AND operation='upsert'",
          [f.tenantId]
        )
      ).rowCount
    ).toBe(4);
  });
  it('keeps separate links for students and removes access when enrollment ends', async () => {
    const f = await fixture();
    const email = `student-${f.email}`;
    const studentId = (
      await pool.query(
        "INSERT INTO students(tenant_id,branch_id,email,full_name) VALUES ($1,$2,$3,'Student') RETURNING id",
        [f.tenantId, f.branchId, email]
      )
    ).rows[0].id;
    const userId = (
      await pool.query(
        "INSERT INTO users(tenant_id,email,password_hash,full_name,role,google_access_token) VALUES ($1,$2,'synthetic-only','Student','student',$3) RETURNING id",
        [f.tenantId, email, `synthetic-${email}`]
      )
    ).rows[0].id;
    await pool.query(
      "INSERT INTO class_students(tenant_id,class_id,student_id,status) VALUES ($1,$2,$3,'enrolled')",
      [f.tenantId, f.classId, studentId]
    );
    const studentLink = (
      await pool.query('SELECT id FROM google_calendar_links WHERE tenant_id=$1 AND user_id=$2', [
        f.tenantId,
        userId,
      ])
    ).rows[0].id;
    await Promise.all([
      GoogleSyncService.processLink(f.linkId),
      GoogleSyncService.processLink(studentLink),
    ]);
    expect(events.size).toBe(2);
    const adminRevision = (await state(f)).revision;
    await pool.query(
      'DELETE FROM class_students WHERE tenant_id=$1 AND class_id=$2 AND student_id=$3',
      [f.tenantId, f.classId, studentId]
    );
    expect((await state({ ...f, linkId: studentLink })).operation).toBe('delete');
    expect((await state(f)).revision).toBe(adminRevision);
    await GoogleSyncService.processLink(studentLink);
    expect(events.size).toBe(1);
  });
  it('does not create new copies of historical sessions, but keeps existing links updated', async () => {
    const f = await fixture();
    await GoogleSyncService.processLink(f.linkId);
    await pool.query(
      "INSERT INTO schedule_sessions(tenant_id,class_id,teacher_id,room_id,session_date,start_time,end_time) VALUES ($1,$2,$3,$4,CURRENT_DATE-2,'08:00','09:00')",
      [f.tenantId, f.classId, f.teacherId, f.roomId]
    );
    await GoogleSyncService.createJob(f.tenantId, f.userId);
    expect(
      (await pool.query('SELECT 1 FROM google_calendar_links WHERE tenant_id=$1', [f.tenantId]))
        .rowCount
    ).toBe(1);
    await pool.query(
      'UPDATE schedule_sessions SET session_date=CURRENT_DATE-1 WHERE tenant_id=$1 AND id=$2',
      [f.tenantId, f.sessionId]
    );
    expect((await state(f)).operation).toBe('upsert');
    await GoogleSyncService.processLink(f.linkId);
    expect(events.size).toBe(1);
  });
  it('serializes reconnection against an in-flight provider operation and ignores stale generations', async () => {
    const f = await fixture();
    delayInsert = true;
    const running = GoogleSyncService.processLink(f.linkId);
    await waitUntil(() => insert.mock.calls.length > 0);
    const reconnect = pool.query(
      "UPDATE users SET google_access_token='new-account' WHERE tenant_id=$1 AND id=$2",
      [f.tenantId, f.userId]
    );
    await Promise.all([running, reconnect]);
    expect((await state(f)).state).toBe('pending');
    expect((await state(f)).connection_version).toBe(1);
    await GoogleSyncService.processLink(f.linkId);
    expect(events.size).toBe(2);
    const count = insert.mock.calls.length;
    await pool.query(
      "UPDATE google_sync_outbox SET connection_version=0,state='pending' WHERE tenant_id=$1 AND link_id=$2",
      [f.tenantId, f.linkId]
    );
    await GoogleSyncService.processLink(f.linkId);
    expect((await state(f)).state).toBe('connection_required');
    expect(insert).toHaveBeenCalledTimes(count);
  });
  it('reclaims a claimed row after the worker process is actually terminated', async () => {
    const f = await fixture();
    const child = fork(resolve(__dirname, '../fixtures/google-sync-crash-worker.cjs'), [f.linkId], {
      execArgv: ['-r', require.resolve('ts-node/register/transpile-only')],
      env: {
        ...process.env,
        DATABASE_URL: process.env.PG_INTEGRITY_TEST_URL + '?sslmode=disable',
        DISABLE_BACKGROUND_JOBS: 'false',
      },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    try {
      await Promise.race([
        once(child, 'message'),
        new Promise((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error('Crash worker did not claim work')),
            15000
          );
          timer.unref();
        }),
      ]);
      expect((await state(f)).state).toBe('syncing');
    } finally {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
    await GoogleSyncService.processLink(f.linkId);
    expect((await state(f)).state).toBe('synced');
    expect(insert).toHaveBeenCalledTimes(1);
  });
  it('runs the pg-boss consumer through restart and drains more than one batch', async () => {
    const f = await fixture();
    const slots = Array.from({ length: 21 }, (_, i) => ({
      classId: f.classId,
      teacherId: f.teacherId,
      roomId: f.roomId,
      sessionDate: `2090-03-${String(i + 1).padStart(2, '0')}`,
      startTime: '08:00',
      endTime: '09:00',
    }));
    await ScheduleService.createSessions(f.tenantId, f.userId, slots);
    let queue = new PgBoss({
      connectionString: process.env.PG_INTEGRITY_TEST_URL!,
      schema: 'qa_google_sync_jobs',
      newJobCheckIntervalSeconds: 1,
    });
    const errors: Error[] = [];
    queue.on('error', (error: Error) => errors.push(error));
    try {
      await queue.start();
      await initGoogleSyncJobs(queue);
      await waitUntil(
        async () =>
          (
            await pool.query(
              "SELECT 1 FROM google_sync_outbox WHERE tenant_id=$1 AND state<>'synced'",
              [f.tenantId]
            )
          ).rowCount === 0
      );
      expect(events.size).toBe(22);
      await queue.stop({ graceful: true, destroy: true });
      await pool.query(
        "UPDATE schedule_sessions SET notes='after restart' WHERE tenant_id=$1 AND id=$2",
        [f.tenantId, f.sessionId]
      );
      queue = new PgBoss({
        connectionString: process.env.PG_INTEGRITY_TEST_URL!,
        schema: 'qa_google_sync_jobs',
        newJobCheckIntervalSeconds: 1,
      });
      queue.on('error', (error: Error) => errors.push(error));
      await queue.start();
      await initGoogleSyncJobs(queue);
      await waitUntil(async () => (await state(f)).state === 'synced');
      expect(events.size).toBe(22);
      expect(errors).toEqual([]);
    } finally {
      await queue.stop({ graceful: false, destroy: true });
      await pool.query('DROP SCHEMA IF EXISTS qa_google_sync_jobs CASCADE');
    }
  });
});

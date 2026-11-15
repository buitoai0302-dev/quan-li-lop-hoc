import { randomUUID } from 'node:crypto';
import pool from '../../src/db';
import { AttendanceService } from '../../src/services/attendance.service';
import { ROLES } from '../../src/utils/constants';
import { WorkItemsService } from '../../src/services/work-items.service';
import { StudentProfileService } from '../../src/services/student-profile.service';
import { TuitionService } from '../../src/services/tuition.service';

jest.mock('../../src/db', () => {
  const { Pool } = jest.requireActual<typeof import('pg')>('pg');
  return { __esModule: true, default: new Pool({ connectionString: process.env.PG_INTEGRITY_TEST_URL, connectionTimeoutMillis: 5000 }) };
});

const url = process.env.PG_INTEGRITY_TEST_URL;
const describePostgres = url ? describe : describe.skip;
const tenantIds: string[] = [];
async function fixture() {
  const email = `qa-${randomUUID()}@example.test`;
  const tenantId = (await pool.query("INSERT INTO tenants (name, plan_id) SELECT 'Workflow QA', id FROM plan_definitions WHERE code = 'FREE' RETURNING id")).rows[0].id as string;
  tenantIds.push(tenantId);
  const branchId = (await pool.query("INSERT INTO branches (tenant_id, name) VALUES ($1, 'QA') RETURNING id", [tenantId])).rows[0].id as string;
  const userId = (await pool.query("INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'synthetic-only', 'QA Admin', 'admin') RETURNING id", [tenantId, email])).rows[0].id as string;
  const teacherId = (await pool.query("INSERT INTO teachers (tenant_id, branch_id, full_name, email) VALUES ($1, $2, 'QA Teacher', $3) RETURNING id", [tenantId, branchId, email])).rows[0].id as string;
  const roomId = (await pool.query("INSERT INTO rooms (tenant_id, branch_id, name, capacity) VALUES ($1, $2, 'QA Room', 30) RETURNING id", [tenantId, branchId])).rows[0].id as string;
  const subjectId = (await pool.query("INSERT INTO subjects (tenant_id, name, code) VALUES ($1, 'QA Subject', 'QA') RETURNING id", [tenantId])).rows[0].id as string;
  const classId = (await pool.query("INSERT INTO classes (tenant_id, branch_id, teacher_id, subject_id, name, max_capacity, start_date, end_date) VALUES ($1, $2, $3, $4, 'QA Class', 30, CURRENT_DATE - 1, CURRENT_DATE + 365) RETURNING id", [tenantId, branchId, teacherId, subjectId])).rows[0].id as string;
  const students: string[] = [];
  for (let index = 0; index < 3; index++) students.push((await pool.query("INSERT INTO students (tenant_id, branch_id, full_name, email) VALUES ($1, $2, $3, $4) RETURNING id", [tenantId, branchId, `Student ${index}`, `${index}-${email}`])).rows[0].id);
  await pool.query('INSERT INTO class_students (tenant_id, class_id, student_id) SELECT $1, $2, unnest($3::uuid[])', [tenantId, classId, students.slice(0, 2)]);
  const sessionIds: string[] = [];
  for (const days of [0, -1, 1]) sessionIds.push((await pool.query("INSERT INTO schedule_sessions (tenant_id, class_id, teacher_id, room_id, session_date, start_time, end_time) VALUES ($1,$2,$3,$4,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + $5::int,'08:00','09:00') RETURNING id", [tenantId, classId, teacherId, roomId, days])).rows[0].id);
  return { tenantId, branchId, userId, teacherId, roomId, classId, students, today: sessionIds[0], past: sessionIds[1], future: sessionIds[2], actor: { userId, role: ROLES.ADMIN as string } };
}

describePostgres('workflow data integrity', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
    if (process.env.PG_INTEGRITY_CONFIRMATION !== 'isolated-synthetic-staging' || target.searchParams.has('options') || !['postgres:', 'postgresql:'].includes(target.protocol) || !((loopback && target.pathname === '/eduschedule_integrity_test') || (target.pathname === '/eduschedule_staging' && (loopback || target.searchParams.get('sslmode') === 'verify-full')))) throw new Error('Isolated synthetic PostgreSQL required');
    expect((await pool.query('SELECT current_database() AS name')).rows[0].name).toBe(decodeURIComponent(target.pathname.slice(1)));
  });
  afterAll(async () => {
    if (tenantIds.length) {
      await pool.query('DELETE FROM schedule_sessions WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
      await pool.query('DELETE FROM classes WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
      await pool.query('DELETE FROM students WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
      await pool.query('DELETE FROM teachers WHERE tenant_id = ANY($1::uuid[])', [tenantIds]);
      await pool.query('DELETE FROM tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
    }
    await pool.end();
  });

  it('serializes concurrent edits, records only changes, and preserves departed students', async () => {
    const f = await fixture();
    const records = [{ student_id: f.students[0], status: 'present' }];
    const responses = await Promise.allSettled([
      AttendanceService.recordAttendance(f.tenantId, f.today, records, f.actor, { expectedVersion: 0 }),
      AttendanceService.recordAttendance(f.tenantId, f.today, [{ ...records[0], status: 'absent' }], f.actor, { expectedVersion: 0 }),
    ]);
    expect(responses.filter(response => response.status === 'fulfilled')).toHaveLength(1);
    expect(responses.filter(response => response.status === 'rejected')).toEqual([expect.objectContaining({ reason: expect.objectContaining({ errorCode: 'ATTENDANCE_VERSION_CONFLICT' }) })]);
    const current = await AttendanceService.getAttendanceBySession(f.tenantId, f.today, f.actor);
    expect(current.data.version).toBe(1);
    await AttendanceService.recordAttendance(f.tenantId, f.today, [{ student_id: f.students[0], status: current.data.attendance[0].status }], f.actor, { expectedVersion: 1 });
    expect((await AttendanceService.getHistory(f.tenantId, f.today, f.actor)).items).toHaveLength(1);
    await pool.query('DELETE FROM class_students WHERE tenant_id = $1 AND student_id = $2', [f.tenantId, f.students[0]]);
    expect((await AttendanceService.getAttendanceBySession(f.tenantId, f.today, f.actor)).data.attendance).toHaveLength(2);
  });

  it('requires historical evidence or explicit confirmation without re-enrollment', async () => {
    const f = await fixture();
    expect((await AttendanceService.getAttendanceBySession(f.tenantId, f.past, f.actor)).data.attendance).toEqual([]);
    const records = [{ student_id: f.students[2], status: 'late' }];
    await expect(AttendanceService.recordAttendance(f.tenantId, f.past, records, f.actor, { expectedVersion: 0 })).rejects.toMatchObject({ errorCode: 'ATTENDANCE_REASON_REQUIRED' });
    await expect(AttendanceService.recordAttendance(f.tenantId, f.past, records, f.actor, { expectedVersion: 0, reason: 'Correct register' })).rejects.toMatchObject({ errorCode: 'STUDENT_NOT_ENROLLED' });
    await AttendanceService.recordAttendance(f.tenantId, f.past, records, f.actor, { expectedVersion: 0, reason: 'Correct register', confirmedStudentIds: [f.students[2]] });
    expect((await AttendanceService.getHistory(f.tenantId, f.past, f.actor)).items[0]).toMatchObject({ before_status: null, after_status: 'late', confirmed_addition: true, reason: 'Correct register' });
    expect((await pool.query('SELECT 1 FROM class_students WHERE tenant_id=$1 AND student_id=$2', [f.tenantId, f.students[2]])).rows).toEqual([]);
    await expect(AttendanceService.recordAttendance(f.tenantId, f.past, records, { ...f.actor, role: ROLES.TEACHER }, { expectedVersion: 1, reason: 'No access' })).rejects.toMatchObject({ errorCode: 'SESSION_DATE_RESTRICTED' });
  });

  it('rejects foreign tenants, unassigned teachers, future/cancelled sessions and duplicate students', async () => {
    const a = await fixture(); const b = await fixture();
    const records = [{ student_id: a.students[0], status: 'present' }];
    await expect(AttendanceService.getAttendanceBySession(b.tenantId, a.today, b.actor)).rejects.toMatchObject({ errorCode: 'SESSION_NOT_FOUND' });
    await expect(AttendanceService.getAttendanceBySession(a.tenantId, a.today, { userId: b.userId, role: ROLES.TEACHER })).rejects.toMatchObject({ errorCode: 'SESSION_NOT_FOUND' });
    await expect(AttendanceService.recordAttendance(a.tenantId, a.future, records, a.actor, { expectedVersion: 0 })).rejects.toMatchObject({ errorCode: 'SESSION_DATE_RESTRICTED' });
    await expect(AttendanceService.recordAttendance(a.tenantId, a.past, [{ student_id: b.students[0], status: 'present' }], a.actor, { expectedVersion: 0, reason: 'Wrong tenant', confirmedStudentIds: [b.students[0]] })).rejects.toMatchObject({ errorCode: 'STUDENT_NOT_ENROLLED' });
    await expect(AttendanceService.recordAttendance(a.tenantId, a.today, [...records, ...records], a.actor, { expectedVersion: 0 })).rejects.toMatchObject({ errorCode: 'INVALID_DATA' });
    await pool.query("UPDATE schedule_sessions SET status='cancelled' WHERE tenant_id=$1 AND id=$2", [a.tenantId, a.today]);
    expect((await AttendanceService.getAttendanceBySession(a.tenantId, a.today, a.actor)).data.editingPolicy.editable).toBe(false);
    await expect(AttendanceService.recordAttendance(a.tenantId, a.today, records, a.actor)).rejects.toMatchObject({ errorCode: 'SESSION_DATE_RESTRICTED' });
  });

  it('rolls back attendance, roster and version when audit cannot be committed', async () => {
    const f = await fixture();
    await expect(AttendanceService.recordAttendance(f.tenantId, f.today, [{ student_id: f.students[0], status: 'present' }], { userId: randomUUID(), role: ROLES.ADMIN }, { expectedVersion: 0 })).rejects.toMatchObject({ code: '23503' });
    expect((await pool.query('SELECT attendance_version FROM schedule_sessions WHERE tenant_id=$1 AND id=$2', [f.tenantId, f.today])).rows[0].attendance_version).toBe(0);
    expect((await pool.query('SELECT 1 FROM attendance WHERE tenant_id=$1 AND session_id=$2', [f.tenantId, f.today])).rows).toEqual([]);
    expect((await pool.query('SELECT 1 FROM attendance_session_students WHERE tenant_id=$1 AND session_id=$2', [f.tenantId, f.today])).rows).toEqual([]);
  });

  it('returns only actionable daily work, excludes empty/deleted rosters and scopes teachers', async () => {
    const f = await fixture(); const other = await fixture();
    const options = { limit: 5, offset: 0 };
    const before = await WorkItemsService.getWorkItems(f.tenantId, f.actor, options);
    expect(before.groups.find(group => group.type === 'attendance')?.items.map(item => item.id)).toEqual([f.today]);
    expect((await WorkItemsService.getWorkItems(f.tenantId, { ...f.actor, role: ROLES.TEACHER }, options)).groups.map(group => group.type)).toEqual(['attendance']);
    expect((await WorkItemsService.getWorkItems(f.tenantId, { userId: other.userId, role: ROLES.TEACHER }, options)).groups[0].total).toBe(0);
    await expect(WorkItemsService.getWorkItems(f.tenantId, { ...f.actor, role: ROLES.TEACHER }, { ...options, group: 'tuition' })).rejects.toMatchObject({ statusCode: 403 });
    await pool.query('DELETE FROM class_students WHERE tenant_id=$1', [f.tenantId]);
    expect((await WorkItemsService.getWorkItems(f.tenantId, f.actor, options)).groups[0].total).toBe(0);
    await pool.query('INSERT INTO attendance_session_students (tenant_id, session_id, student_id) VALUES ($1,$2,$3)', [f.tenantId,f.today,f.students[0]]);
    await pool.query('UPDATE students SET is_deleted=true WHERE tenant_id=$1 AND id=$2', [f.tenantId,f.students[0]]);
    expect((await WorkItemsService.getWorkItems(f.tenantId, f.actor, options)).groups[0].total).toBe(0);
    await pool.query('UPDATE classes SET teacher_id=NULL WHERE tenant_id=$1 AND id=$2', [f.tenantId,f.classId]);
    expect((await WorkItemsService.getWorkItems(f.tenantId, f.actor, { ...options, group:'classes' })).groups[0].items[0]).toMatchObject({id:f.classId,missing_teacher:true,missing_sessions:false});
    await pool.query("UPDATE schedule_sessions SET status='cancelled' WHERE tenant_id=$1", [f.tenantId]);
    expect((await WorkItemsService.getWorkItems(f.tenantId, f.actor, { ...options, group:'classes' })).groups[0].items[0]).toMatchObject({missing_sessions:true});
  });

  it('uses the payment ledger, excludes waived/future debt and paginates student histories', async () => {
    const f = await fixture(); const other = await fixture();
    const tuitionIds: string[] = [];
    for (const [days, status] of [[0,'unpaid'],[-1,'waived'],[1,'unpaid']] as const) tuitionIds.push((await pool.query("INSERT INTO tuitions (tenant_id,student_id,class_id,amount,due_date,status) VALUES ($1,$2,$3,1000.25,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+$4::int,$5) RETURNING id",[f.tenantId,f.students[0],f.classId,days,status])).rows[0].id);
    await TuitionService.recordPayment(f.tenantId, f.userId, tuitionIds[0], { amount_paid:250.10 });
    const work = await WorkItemsService.getWorkItems(f.tenantId, f.actor, {group:'tuition',limit:5,offset:0});
    expect(work.groups[0]).toMatchObject({total:1,items:[{id:tuitionIds[0],outstanding_vnd:'750.15'}]});
    expect((await WorkItemsService.getWorkItems(f.tenantId, f.actor, {group:'tuition',limit:5,offset:20})).groups[0]).toMatchObject({total:1,items:[]});
    expect(await StudentProfileService.getProfile(f.tenantId, f.students[0], ROLES.STAFF)).toMatchObject({outstanding_vnd:'1750.40',paid_vnd:'250.10'});
    expect(await StudentProfileService.getHistory(f.tenantId, f.students[0], ROLES.ADMIN, {type:'payments',limit:1,offset:0})).toMatchObject({total:1,items:[{tuition_id:tuitionIds[0],amount_vnd:'250.10'}]});
    expect(await StudentProfileService.getHistory(f.tenantId, f.students[0], ROLES.ADMIN, {type:'classes',limit:1,offset:1})).toMatchObject({total:1,items:[]});
    expect((await TuitionService.getTuitions(f.tenantId,{student_id:f.students[0],tuition_id:tuitionIds[0]})).data.map(item => item.id)).toEqual([tuitionIds[0]]);
    expect((await TuitionService.getTuitions(other.tenantId,{tuition_id:tuitionIds[0]})).data).toEqual([]);
    await expect(StudentProfileService.getProfile(other.tenantId, f.students[0], ROLES.ADMIN)).rejects.toMatchObject({errorCode:'STUDENT_NOT_FOUND'});
    await expect(StudentProfileService.getHistory(other.tenantId, f.students[0], ROLES.ADMIN, {type:'attendance',limit:10,offset:0})).rejects.toMatchObject({errorCode:'STUDENT_NOT_FOUND'});
    await expect(StudentProfileService.getProfile(f.tenantId, f.students[0], ROLES.TEACHER)).rejects.toMatchObject({statusCode:403});
    await TuitionService.recordPayment(f.tenantId, f.userId, tuitionIds[0], { amount_paid:750.15 });
    expect((await WorkItemsService.getWorkItems(f.tenantId, f.actor, {group:'tuition',limit:5,offset:0})).groups[0].total).toBe(0);
  });
});

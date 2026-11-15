import {
  bulkStudentImportSchema,
  importClassSchema,
  importRoomSchema,
} from '../../src/validators/import.validator';

const branchId = '11111111-1111-4111-8111-111111111111';
const pupil = { full_name: 'Pupil', email: 'pupil@example.test' };

it.each(['2008-12-31', '31/12/2008', 39813])('normalizes imported birth date %s', (date) => {
  const parsed = bulkStudentImportSchema.parse({
    branch_id: branchId,
    students: [{ ...pupil, date_of_birth: date }],
  });
  expect(parsed.students[0].date_of_birth).toBe('2008-12-31');
});

it('rejects impossible dates and oversized batches before writes', () => {
  expect(
    bulkStudentImportSchema.safeParse({
      branch_id: branchId,
      students: [{ ...pupil, date_of_birth: '31/02/2008' }],
    }).success
  ).toBe(false);
  expect(
    bulkStudentImportSchema.safeParse({ branch_id: branchId, students: Array(501).fill(pupil) })
      .success
  ).toBe(false);
  expect(
    importClassSchema.safeParse({
      branch_id: branchId,
      name: 'QA',
      teacher_email: pupil.email,
      start_date: '2026-11-20',
      end_date: '2026-11-19',
    }).success
  ).toBe(false);
  expect(
    importRoomSchema.safeParse({ branch_id: branchId, name: 'QA', capacity: '30oops' }).success
  ).toBe(false);
  expect(importRoomSchema.safeParse({ branch_id: branchId, name: 'QA', capacity: 0 }).success).toBe(
    false
  );
});

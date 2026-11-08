/** Run only against a new staging environment containing synthetic fixtures. */
const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required for staging tests`);
  return value;
};

const baseUrl = required('STAGING_API_URL').replace(/\/$/, '');
const parsedUrl = new URL(baseUrl);
if (process.env.STAGING_CONFIRMATION !== 'isolated-synthetic-staging' ||
    !parsedUrl.hostname.includes('staging') ||
    !['https:', 'http:'].includes(parsedUrl.protocol)) {
  throw new Error('Refusing to run live tests without an explicitly named staging host and confirmation');
}

const tenantAToken = required('STAGING_TENANT_A_TOKEN');
const tenantBToken = required('STAGING_TENANT_B_TOKEN');
const tenantBClassId = required('STAGING_TENANT_B_CLASS_ID');
const tenantBStudentId = required('STAGING_TENANT_B_STUDENT_ID');
const tenantBBranchId = required('STAGING_TENANT_B_BRANCH_ID');
if (tenantAToken === tenantBToken) throw new Error('Staging tokens must belong to different tenants');

const call = (path: string, token: string, init?: RequestInit) => fetch(`${baseUrl}${path}`, {
  ...init,
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...init?.headers,
  },
});

describe('two tenant staging isolation', () => {
  it('allows tenant B to read its own class but hides it from tenant A', async () => {
    const owner = await call(`/api/classes/${tenantBClassId}`, tenantBToken);
    expect(owner.status).toBe(200);

    const outsider = await call(`/api/classes/${tenantBClassId}`, tenantAToken);
    expect(outsider.status).toBe(404);
  });

  it('rejects cross tenant student update and import branch reference', async () => {
    const before = await call('/api/students', tenantBToken);
    expect(before.status).toBe(200);
    const students = await before.json() as Array<{ id: string; full_name: string; email: string }>;
    const student = students.find((item) => item.id === tenantBStudentId);
    expect(student).toBeDefined();

    const update = await call(`/api/students/${tenantBStudentId}`, tenantAToken, {
      method: 'PUT',
      body: JSON.stringify({ full_name: 'Cross tenant mutation must fail' }),
    });
    expect(update.status).toBe(404);

    const imported = await call('/api/import/students', tenantAToken, {
      method: 'POST',
      body: JSON.stringify({ data: [{
        full_name: 'Cross tenant import must fail',
        email: 'cross-tenant-qa@example.test',
        branch_id: tenantBBranchId,
      }] }),
    });
    expect(imported.status).toBe(400);

    const after = await call('/api/students', tenantBToken);
    expect(after.status).toBe(200);
    const afterStudents = await after.json() as Array<{ id: string; full_name: string; email: string }>;
    expect(afterStudents.find((item) => item.id === tenantBStudentId)?.full_name)
      .toBe(student?.full_name);
    expect(afterStudents.some((item) => item.email === 'cross-tenant-qa@example.test'))
      .toBe(false);
  });
});

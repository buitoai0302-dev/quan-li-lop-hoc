import pool from '../../src/db';
import { importData } from '../../src/controllers/import.controller';
import { StudentService } from '../../src/services/student.service';
import { ERROR_CODES } from '../../src/utils/constants';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

const tenantId = '11111111-1111-4111-8111-111111111111';
const otherBranchId = '22222222-2222-4222-8222-222222222222';

describe('tenant references in imports', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['students', 'teachers', 'rooms', 'classes'])(
    'rejects another tenant branch before importing %s', async (type) => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      const req = {
        tenantId,
        params: { type },
        body: { data: [{ branch_id: otherBranchId, full_name: 'Fixture', email: 'fixture@example.test' }] },
      };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await importData(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        errorCode: ERROR_CODES.INVALID_TENANT_REFERENCE,
      }));
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM branches WHERE tenant_id = $1'),
        [tenantId, [otherBranchId]],
      );
      expect(res.json).not.toHaveBeenCalled();
    }
  );

  it('rolls back student bulk import for another tenant branch', async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    client.query.mockResolvedValue({ rows: [] });
    (pool.connect as jest.Mock).mockResolvedValue(client);

    await expect(StudentService.bulkImport(tenantId, {
      branch_id: otherBranchId,
      students: [{ full_name: 'Fixture', email: 'fixture@example.test' }],
    } as any)).rejects.toMatchObject({
      statusCode: 400,
      errorCode: ERROR_CODES.INVALID_TENANT_REFERENCE,
    });

    expect(client.query).toHaveBeenCalledTimes(3);
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed IDs before sending a uuid cast to PostgreSQL', async () => {
    const req = {
      tenantId,
      params: { type: 'students' },
      body: { data: [{ branch_id: 'not-a-uuid', full_name: 'Fixture' }] },
    };
    const next = jest.fn();

    await importData(req as any, { json: jest.fn() } as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      errorCode: ERROR_CODES.INVALID_TENANT_REFERENCE,
    }));
    expect(pool.query).not.toHaveBeenCalled();
  });
});

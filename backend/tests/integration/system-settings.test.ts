import pool from '../../src/db';
import { SystemService } from '../../src/services/system.service';

jest.mock('../../src/db', () => ({ __esModule: true, default: { connect: jest.fn(), query: jest.fn() } }));

describe('public legal settings', () => {
  const client = { query: jest.fn(), release: jest.fn() };
  beforeEach(() => {
    client.query.mockReset();
    client.release.mockReset();
    (pool.connect as jest.Mock).mockResolvedValue(client);
    client.query.mockResolvedValue({ rows: [] });
  });

  it('never exposes unpublished draft policy text', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [
      { setting_key: 'LEGAL_PUBLISHED', setting_value: 'false' },
      { setting_key: 'PRIVACY_POLICY_VI', setting_value: 'private draft' },
      { setting_key: 'CONTACT_EMAIL', setting_value: 'operator@example.test' },
    ] });
    expect(await SystemService.getPublicSettings()).toEqual({
      LEGAL_PUBLISHED: 'false', CONTACT_EMAIL: 'operator@example.test',
    });
  });

  it('rejects publication without an operator, contact details and both languages', async () => {
    await expect(SystemService.updateSettings({ LEGAL_PUBLISHED: 'true' })).rejects.toThrow('Complete legal operator');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('publishes a complete approved policy set', async () => {
    const settings = {
      LEGAL_PUBLISHED: 'true', LEGAL_ENTITY_NAME: 'Operator', LEGAL_EFFECTIVE_DATE: '2026-10-25',
      CONTACT_EMAIL: 'hello@example.test', CONTACT_ADDRESS: 'Street 1',
      PRIVACY_POLICY_VI: 'Vietnamese privacy', PRIVACY_POLICY_EN: 'English privacy',
      TERMS_OF_SERVICE_VI: 'Vietnamese terms', TERMS_OF_SERVICE_EN: 'English terms',
    };
    await expect(SystemService.updateSettings(settings)).resolves.toMatchObject({ success: true });
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO system_settings'), ['LEGAL_PUBLISHED', 'true']);
  });

  it('rejects arbitrary setting keys', async () => {
    await expect(SystemService.updateSettings({ JWT_SECRET: 'unsafe' })).rejects.toThrow('Invalid payload');
    expect(pool.connect).not.toHaveBeenCalled();
  });
});

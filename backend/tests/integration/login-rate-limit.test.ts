import { checkRateLimit, recordFailedAttempt, clearAttempts } from '../../src/services/rateLimit.service';
import { AuthService } from '../../src/services/auth.service';
import pool from '../../src/db';

jest.mock('../../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));

describe('login rate limit', () => {
  const ip = '192.0.2.45';
  const email = 'rate-limit-test@example.test';

  afterAll(async () => {
    await clearAttempts(ip, email);
  });

  it('blocks after five failed attempts and returns a retry time', async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      expect((await checkRateLimit(ip, email)).blocked).toBe(false);
      await recordFailedAttempt(ip, email);
    }

    const result = await checkRateLimit(ip, email);
    expect(result.blocked).toBe(true);
    expect(result.remainingAttempts).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(15 * 60);
  });

  it('returns the rate limit error on the fifth failed login', async () => {
    const loginIp = '192.0.2.46';
    const loginEmail = 'unknown-rate-limit-test@example.test';
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

    try {
      for (let attempt = 1; attempt < 5; attempt++) {
        await expect(AuthService.login(loginEmail, 'incorrect', loginIp)).rejects.toMatchObject({
          statusCode: 401,
        });
      }
      await expect(AuthService.login(loginEmail, 'incorrect', loginIp)).rejects.toMatchObject({
        statusCode: 429,
        errorCode: 'TOO_MANY_ATTEMPTS',
        params: { minutes: 15 },
      });
    } finally {
      await clearAttempts(loginIp, loginEmail);
    }
  });
});

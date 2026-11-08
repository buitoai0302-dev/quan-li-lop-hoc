jest.mock('ioredis', () => ({
  __esModule: true,
  default: class BrokenRedis {
    on() { return this; }
    async get(): Promise<string | null> { throw new Error('Redis unavailable'); }
    disconnect() { /* connection is already unavailable */ }
  },
}));

describe('rate limit cache failover', () => {
  it('continues counting failed logins in memory when Redis rejects a read', async () => {
    const previousUrl = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://unavailable.example.test:6379';
    jest.resetModules();

    try {
      const { checkRateLimit, recordFailedAttempt, clearAttempts } =
        require('../../src/services/rateLimit.service') as typeof import('../../src/services/rateLimit.service');
      const ip = '192.0.2.47';
      const email = 'redis-fallback@example.test';
      expect((await checkRateLimit(ip, email)).blocked).toBe(false);
      await recordFailedAttempt(ip, email);
      expect((await checkRateLimit(ip, email)).remainingAttempts).toBe(4);
      await clearAttempts(ip, email);
    } finally {
      if (previousUrl === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = previousUrl;
      jest.resetModules();
    }
  });
});

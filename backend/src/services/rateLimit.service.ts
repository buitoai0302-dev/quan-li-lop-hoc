import NodeCache from 'node-cache';
import Redis from 'ioredis';

// ─── Khởi tạo Cache: Thử dùng Redis, nếu không có thì fallback dùng NodeCache (RAM)
let redisClient: Redis | null = null;
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Không retry mãi mãi nếu không kết nối được
    });

    redisClient.on('error', (err) => {
      console.warn('[Redis] Connection error, falling back to in-memory cache.', err.message);
      redisClient = null;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Rate Limit Service connected successfully.');
    });
  } catch (err) {
    console.warn('[Redis] Failed to initialize, falling back to in-memory cache.');
    redisClient = null;
  }
} else {
  console.log(
    '[RateLimit] No REDIS_URL provided. Using in-memory node-cache. (Not recommended for multi-instance deployments)'
  );
}

const loginAttemptCache = new NodeCache({ stdTTL: 15 * 60, checkperiod: 60 });
const emailRateCache = new NodeCache({ stdTTL: 15 * 60, checkperiod: 60 });

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60; // 15 minutes
const MAX_EMAIL_ATTEMPTS = 3;

interface AttemptData {
  count: number;
  blockedUntil?: number;
}

// ─── Helpers để wrap logic lưu trữ (Redis vs Memory) ───

const getCache = async (key: string, isEmail: boolean): Promise<AttemptData | null> => {
  if (redisClient) {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }
  return isEmail
    ? emailRateCache.get<AttemptData>(key) || null
    : loginAttemptCache.get<AttemptData>(key) || null;
};

const setCache = async (key: string, data: AttemptData, ttlSeconds: number, isEmail: boolean) => {
  if (redisClient) {
    await redisClient.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } else {
    if (isEmail) emailRateCache.set(key, data, ttlSeconds);
    else loginAttemptCache.set(key, data, ttlSeconds);
  }
};

const delCache = async (key: string, isEmail: boolean) => {
  if (redisClient) {
    await redisClient.del(key);
  } else {
    if (isEmail) emailRateCache.del(key);
    else loginAttemptCache.del(key);
  }
};

// ─── Login Rate Limiting ─────────────────────────────────────────────────────

export const checkRateLimit = async (
  ip: string,
  email: string
): Promise<{ blocked: boolean; remainingAttempts: number; retryAfter?: number }> => {
  const key = `login:${ip}:${email}`;
  const data = (await getCache(key, false)) || { count: 0 };

  if (data.blockedUntil && Date.now() < data.blockedUntil) {
    return {
      blocked: true,
      remainingAttempts: 0,
      retryAfter: Math.ceil((data.blockedUntil - Date.now()) / 1000),
    };
  }

  return {
    blocked: false,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - data.count),
  };
};

export const recordFailedAttempt = async (ip: string, email: string): Promise<void> => {
  const key = `login:${ip}:${email}`;
  const data = (await getCache(key, false)) || { count: 0 };

  data.count += 1;

  if (data.count >= MAX_ATTEMPTS) {
    data.blockedUntil = Date.now() + BLOCK_DURATION * 1000;
    await setCache(key, data, BLOCK_DURATION, false);
  } else {
    await setCache(key, data, BLOCK_DURATION, false);
  }
};

export const clearAttempts = async (ip: string, email: string): Promise<void> => {
  const key = `login:${ip}:${email}`;
  await delCache(key, false);
};

// ─── Email Endpoint Rate Limiting (forgot-password, resend-verification) ──────

export const checkEmailRateLimit = async (
  ip: string
): Promise<{ blocked: boolean; retryAfter?: number }> => {
  const key = `email:${ip}`;
  const data = (await getCache(key, true)) || { count: 0 };

  if (data.blockedUntil && Date.now() < data.blockedUntil) {
    return { blocked: true, retryAfter: Math.ceil((data.blockedUntil - Date.now()) / 1000) };
  }
  return { blocked: data.count >= MAX_EMAIL_ATTEMPTS };
};

export const recordEmailAttempt = async (ip: string): Promise<void> => {
  const key = `email:${ip}`;
  const data = (await getCache(key, true)) || { count: 0 };
  data.count += 1;

  if (data.count >= MAX_EMAIL_ATTEMPTS) {
    data.blockedUntil = Date.now() + BLOCK_DURATION * 1000;
    await setCache(key, data, BLOCK_DURATION, true);
  } else {
    await setCache(key, data, BLOCK_DURATION, true);
  }
};

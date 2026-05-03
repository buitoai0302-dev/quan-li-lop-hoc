import NodeCache from 'node-cache';

// Cache cho rate limiting - TTL 15 phút
const loginAttemptCache = new NodeCache({ stdTTL: 15 * 60, checkperiod: 60 });

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60; // 15 phút (giây)

interface AttemptData {
  count: number;
  blockedUntil?: number;
}

export const checkRateLimit = (ip: string, email: string): { blocked: boolean; remainingAttempts: number; retryAfter?: number } => {
  const key = `login:${ip}:${email}`;
  const data = loginAttemptCache.get<AttemptData>(key) || { count: 0 };

  if (data.blockedUntil && Date.now() < data.blockedUntil) {
    return {
      blocked: true,
      remainingAttempts: 0,
      retryAfter: Math.ceil((data.blockedUntil - Date.now()) / 1000)
    };
  }

  return {
    blocked: false,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - data.count)
  };
};

export const recordFailedAttempt = (ip: string, email: string): void => {
  const key = `login:${ip}:${email}`;
  const data = loginAttemptCache.get<AttemptData>(key) || { count: 0 };
  
  data.count += 1;

  if (data.count >= MAX_ATTEMPTS) {
    data.blockedUntil = Date.now() + BLOCK_DURATION * 1000;
    loginAttemptCache.set(key, data, BLOCK_DURATION);
  } else {
    loginAttemptCache.set(key, data);
  }
};

export const clearAttempts = (ip: string, email: string): void => {
  const key = `login:${ip}:${email}`;
  loginAttemptCache.del(key);
};

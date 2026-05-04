import NodeCache from 'node-cache';

// ─── Login Rate Limiting ─────────────────────────────────────────────────────
const loginAttemptCache = new NodeCache({ stdTTL: 15 * 60, checkperiod: 60 });

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60; // 15 minutes (seconds)

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

// ─── Email Endpoint Rate Limiting (forgot-password, resend-verification) ──────
// Stricter: max 3 per 15 min per IP to prevent spam
const emailRateCache = new NodeCache({ stdTTL: 15 * 60, checkperiod: 60 });
const MAX_EMAIL_ATTEMPTS = 3;

export const checkEmailRateLimit = (ip: string): { blocked: boolean; retryAfter?: number } => {
  const key = `email:${ip}`;
  const data = emailRateCache.get<AttemptData>(key) || { count: 0 };

  if (data.blockedUntil && Date.now() < data.blockedUntil) {
    return { blocked: true, retryAfter: Math.ceil((data.blockedUntil - Date.now()) / 1000) };
  }
  return { blocked: data.count >= MAX_EMAIL_ATTEMPTS };
};

export const recordEmailAttempt = (ip: string): void => {
  const key = `email:${ip}`;
  const data = emailRateCache.get<AttemptData>(key) || { count: 0 };
  data.count += 1;

  if (data.count >= MAX_EMAIL_ATTEMPTS) {
    data.blockedUntil = Date.now() + BLOCK_DURATION * 1000;
    emailRateCache.set(key, data, BLOCK_DURATION);
  } else {
    emailRateCache.set(key, data);
  }
};

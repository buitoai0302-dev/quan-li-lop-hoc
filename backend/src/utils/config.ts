import { logger } from '../utils/logger';
export const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    logger.error(`FATAL: Environment variable ${key} is missing!`);
    process.exit(1);
  }
  return value;
};

export const config = {
  jwtSecret: () => getEnv('JWT_SECRET'),
  jwtExpiresIn: () => process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: () => process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  frontendUrl: () => process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: () => process.env.BACKEND_URL || 'http://localhost:3000',
  cookieOrigins: () => [
    ...new Set(
      [process.env.FRONTEND_URL, 'http://localhost:5173'].filter((origin): origin is string =>
        Boolean(origin)
      )
    ),
  ],
  allowedOrigins: () => [
    ...new Set([
      process.env.FRONTEND_URL || 'http://localhost:5173',
      ...(process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      'http://localhost:5174',
      'http://localhost:3000',
      'https://eduschedule.vercel.app',
      'https://quan-li-lop-hoc-beta.vercel.app',
    ]),
  ],
  google: {
    clientId: () => getEnv('GOOGLE_CLIENT_ID'),
    clientSecret: () => getEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri: () => `${config.backendUrl()}/api/google/callback`,
  },
  smtp: {
    host: () => process.env.SMTP_HOST || 'smtp.gmail.com',
    port: () => parseInt(process.env.SMTP_PORT || '465', 10),
    user: () => process.env.SMTP_USER,
    pass: () => process.env.SMTP_PASS,
  },
};

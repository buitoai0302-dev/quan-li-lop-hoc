export const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    console.error(`FATAL: Environment variable ${key} is missing!`);
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
  google: {
    clientId: () => getEnv('GOOGLE_CLIENT_ID'),
    clientSecret: () => getEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri: () => `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/google/callback`,
  },
  smtp: {
    host: () => process.env.SMTP_HOST || 'smtp.gmail.com',
    port: () => parseInt(process.env.SMTP_PORT || '465', 10),
    user: () => process.env.SMTP_USER,
    pass: () => process.env.SMTP_PASS,
  },
};

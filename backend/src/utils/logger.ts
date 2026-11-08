import pino from 'pino';

const logFile = process.env.LOG_FILE_PATH;
const options: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  // Never serialize credentials or request bodies into operational logs.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.x-api-key',
      'req.body',
      'res.headers.set-cookie',
      'password',
      'token',
      'google_access_token',
      'google_refresh_token',
    ],
    remove: true,
  },
  transport:
    !logFile && process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
};

// Production stdout remains available to the host. A mounted LOG_FILE_PATH adds JSONL output.
export const logger = logFile
  ? pino(
      options,
      pino.multistream([
        { stream: process.stdout },
        { stream: pino.destination({ dest: logFile, mkdir: true, sync: false }) },
      ])
    )
  : pino(options);

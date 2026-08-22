import { logger } from '../utils/logger';
/**
 * pg-boss Job Queue — thay thế node-cron
 * Lưu job vào PostgreSQL, đảm bảo không bỏ lỡ khi server restart
 */
import PgBoss from 'pg-boss';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for pg-boss');
}

const boss = new PgBoss({
  connectionString,
  // Tự dọn dẹp job cũ sau 7 ngày
  archiveCompletedAfterSeconds: 60 * 60 * 24 * 7,
  deleteAfterSeconds: 60 * 60 * 24 * 14,
});

boss.on('error', (error) => {
  logger.error(error, '[pg-boss] Queue error:');
});

export default boss;

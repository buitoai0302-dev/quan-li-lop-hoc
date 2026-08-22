import { logger } from '../utils/logger';
/**
 * Backup Jobs — dùng pg-boss thay thế node-cron
 * Chạy mỗi giờ, lưu vào DB để không bỏ lỡ khi server restart
 */
import boss from './queue';
import pool from '../db';
import { exportTenantData } from '../services/export.service';
import { uploadBackupToDrive } from '../services/google.service';
import fs from 'fs';
import path from 'path';

const JOB_NAME = 'run-tenant-backups';

// ─── Handler: chạy backup cho tất cả tenant ─────────────────────────────────
async function runTenantBackups() {
  logger.info('[Jobs] Bắt đầu quét các thiết lập backup của trung tâm...');

  try {
    const saResult = await pool.query("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1");
    const superAdminId = saResult.rows[0]?.id;

    if (!superAdminId) {
      logger.info('[Jobs] Không tìm thấy Super Admin, bỏ qua sao lưu.');
      return;
    }

    const tenantsRes = await pool.query('SELECT id, name, email, settings FROM tenants');
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');

    for (const tenant of tenantsRes.rows) {
      const settings = tenant.settings || {};
      const backupConfig = settings.backup;

      if (backupConfig && backupConfig.enabled) {
        const { time, cycle, last_backup_at } = backupConfig;

        if (time && time.startsWith(`${currentHour}:`)) {
          let shouldRun = false;
          if (!last_backup_at) {
            shouldRun = true;
          } else {
            const lastBackup = new Date(last_backup_at);
            const diffDays = Math.ceil(
              Math.abs(now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (cycle === 'daily' && diffDays >= 1) shouldRun = true;
            else if (cycle === 'weekly' && diffDays >= 7) shouldRun = true;
            else if (cycle === 'monthly' && diffDays >= 28) shouldRun = true;
          }

          if (shouldRun) {
            logger.info(`[Jobs] Bắt đầu sao lưu cho trung tâm: ${tenant.name} (${tenant.email})`);
            const timestamp =
              new Date().toISOString().replace(/[-:T]/g, '').replace(/\..+/, '') +
              '_' +
              new Date().getMilliseconds();
            const fileName = `backup_${timestamp}.zip`;
            const filePath = path.join(__dirname, '../../', fileName);
            const folderName = tenant.email || `tenant_${tenant.id}`;

            try {
              await exportTenantData(tenant.id, filePath);
              await uploadBackupToDrive(superAdminId, folderName, filePath, fileName);

              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

              const newSettings = {
                ...settings,
                backup: { ...backupConfig, last_backup_at: new Date().toISOString() },
              };
              await pool.query('UPDATE tenants SET settings = $1 WHERE id = $2', [
                JSON.stringify(newSettings),
                tenant.id,
              ]);

              logger.info(`[Jobs] Sao lưu thành công cho trung tâm: ${tenant.name}`);
            } catch (err) {
              logger.error(`[Jobs] Lỗi sao lưu cho trung tâm ${tenant.name}:`, err);
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
              throw err; // pg-boss sẽ retry
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error(error, '[Jobs] Backup job error:');
    throw error;
  }
}

// ─── Khởi tạo scheduled job ──────────────────────────────────────────────────
export const initBackupJobs = async () => {
  await boss.work(JOB_NAME, async () => {
    await runTenantBackups();
  });

  // Chạy đầu mỗi giờ — lưu vào DB
  await boss.schedule(
    JOB_NAME,
    '0 * * * *',
    {},
    {
      tz: 'Asia/Ho_Chi_Minh',
    }
  );

  logger.info('[Jobs] Backup job scheduled (every hour, persistent)');
};

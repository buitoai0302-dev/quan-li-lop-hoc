import cron from 'node-cron';
import pool from '../db';
import { exportTenantData } from '../services/export.service';
import { uploadBackupToDrive } from '../services/google.service';
import fs from 'fs';
import path from 'path';

export const startBackupCronJob = () => {
  // Chạy mỗi giờ (phút thứ 0)
  cron.schedule('0 * * * *', async () => {
    console.log('[Backup Cron] Bắt đầu quét các thiết lập backup của trung tâm...');

    try {
      // 1. Lấy user id của Super Admin
      const saResult = await pool.query("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1");
      const superAdminId = saResult.rows[0]?.id;

      if (!superAdminId) {
        console.log('[Backup Cron] Không tìm thấy Super Admin, bỏ qua sao lưu.');
        return;
      }

      // 2. Lấy danh sách tenant có cài đặt backup
      const tenantsRes = await pool.query('SELECT id, name, email, settings FROM tenants');
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHour}:00`; // Cron chạy mỗi giờ nên chỉ check giờ

      for (const tenant of tenantsRes.rows) {
        const settings = tenant.settings || {};
        const backupConfig = settings.backup;

        if (backupConfig && backupConfig.enabled) {
          const { time, cycle, last_backup_at } = backupConfig;

          // Kiểm tra giờ chạy (tạm thời bỏ qua phút để chạy mỗi giờ)
          if (time && time.startsWith(`${currentHour}:`)) {
            // Kiểm tra chu kỳ (daily, weekly, monthly)
            let shouldRun = false;
            if (!last_backup_at) {
              shouldRun = true;
            } else {
              const lastBackup = new Date(last_backup_at);
              const diffTime = Math.abs(now.getTime() - lastBackup.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (cycle === 'daily' && diffDays >= 1) shouldRun = true;
              else if (cycle === 'weekly' && diffDays >= 7) shouldRun = true;
              else if (cycle === 'monthly' && diffDays >= 28) shouldRun = true;
            }

            if (shouldRun) {
              console.log(
                `[Backup Cron] Bắt đầu sao lưu cho trung tâm: ${tenant.name} (${tenant.email})`
              );
              const timestamp =
                new Date().toISOString().replace(/[-:T]/g, '').replace(/\..+/, '') +
                '_' +
                new Date().getMilliseconds();
              const fileName = `backup_${timestamp}.zip`;
              const filePath = path.join(__dirname, '../../', fileName);
              const folderName = tenant.email || `tenant_${tenant.id}`;

              try {
                // Xuất dữ liệu
                await exportTenantData(tenant.id, filePath);

                // Upload lên Drive
                await uploadBackupToDrive(superAdminId, folderName, filePath, fileName);

                // Xóa file local sau khi up
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                }

                // Cập nhật last_backup_at
                const newSettings = {
                  ...settings,
                  backup: {
                    ...backupConfig,
                    last_backup_at: new Date().toISOString(),
                  },
                };
                await pool.query('UPDATE tenants SET settings = $1 WHERE id = $2', [
                  JSON.stringify(newSettings),
                  tenant.id,
                ]);

                console.log(`[Backup Cron] Sao lưu thành công cho trung tâm: ${tenant.name}`);
              } catch (err) {
                console.error(`[Backup Cron] Lỗi sao lưu cho trung tâm ${tenant.name}:`, err);
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath); // Dọn dẹp nếu lỗi
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[Backup Cron] Lỗi:', error);
    }
  });
};

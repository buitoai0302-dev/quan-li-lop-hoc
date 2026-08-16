import pool from '../src/db';

async function migrateSystemSettings() {
  try {
    console.log('--- Starting system_settings Migration ---');

    await pool.query('BEGIN');

    const createTableSql = `
      CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value TEXT NOT NULL,
          description TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await pool.query(createTableSql);

    const insertDefaultsSql = `
      INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
      ('SYSTEM_NAME', 'EduSchedule', 'Tên hệ thống'),
      ('CONTACT_EMAIL', 'contact@eduschedule.com', 'Email liên hệ'),
      ('CONTACT_PHONE', '0901234567', 'Số điện thoại hotline'),
      ('CONTACT_ZALO', 'https://zalo.me/0901234567', 'Đường dẫn Zalo liên hệ'),
      ('CONTACT_ADDRESS', '123 Đường ABC, Quận XYZ, TP.HCM', 'Địa chỉ trụ sở'),
      ('TAX_CODE', '0123456789', 'Mã số thuế doanh nghiệp'),
      ('POSTAL_CODE', '700000', 'Mã bưu chính (Zip code)')
      ON CONFLICT (setting_key) DO NOTHING;
    `;
    await pool.query(insertDefaultsSql);

    await pool.query('COMMIT');
    console.log('--- Migration Completed Successfully ---');
    process.exit(0);
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Error during migration:');
    console.error(err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  }
}

migrateSystemSettings();

import pool from '../src/db';

async function migrateSystemSettings() {
  const client = await pool.connect();
  try {
    console.log('--- Starting system_settings Migration ---');

    await client.query('BEGIN');

    const createTableSql = `
      CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value TEXT NOT NULL,
          description TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await client.query(createTableSql);

    const insertDefaultsSql = `
      INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
      ('SYSTEM_NAME', 'EduSchedule', 'Tên hệ thống'),
      ('CONTACT_EMAIL', '', 'Email liên hệ'),
      ('CONTACT_PHONE', '', 'Số điện thoại hotline'),
      ('CONTACT_ZALO', '', 'Đường dẫn Zalo liên hệ'),
      ('CONTACT_ADDRESS', '', 'Địa chỉ trụ sở'),
      ('TAX_CODE', '', 'Mã số thuế doanh nghiệp'),
      ('POSTAL_CODE', '', 'Mã bưu chính (Zip code)')
      ON CONFLICT (setting_key) DO NOTHING;
    `;
    await client.query(insertDefaultsSql);

    await client.query('COMMIT');
    console.log('--- Migration Completed Successfully ---');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error during migration:');
    console.error(err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateSystemSettings().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

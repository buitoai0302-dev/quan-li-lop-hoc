import pool from '../db';
import { ValidationError } from '../utils/errors';

export class SystemService {
  static async getPublicSettings() {
    const result = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const publicKeys = [
      'SYSTEM_NAME',
      'CONTACT_EMAIL',
      'CONTACT_PHONE',
      'CONTACT_ZALO',
      'CONTACT_ADDRESS',
      'TAX_CODE',
      'POSTAL_CODE',
      'PAYMENT_BANK_ID',
      'PAYMENT_BANK_NAME',
      'PAYMENT_ACCOUNT_NUMBER',
      'PAYMENT_ACCOUNT_NAME',
    ];

    return result.rows.reduce((acc: any, row: any) => {
      if (publicKeys.includes(row.setting_key)) {
        acc[row.setting_key] = row.setting_value;
      }
      return acc;
    }, {});
  }

  static async getAdminSettings() {
    const result = await pool.query(
      'SELECT setting_key, setting_value, description FROM system_settings'
    );
    return result.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});
  }

  static async updateSettings(settings: any) {
    if (typeof settings !== 'object' || settings === null) {
      throw new ValidationError('Invalid payload', 'INVALID_DATA');
    }

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        if (typeof value === 'string') {
          await client.query(
            `INSERT INTO system_settings (setting_key, setting_value) 
             VALUES ($1, $2) 
             ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()`,
            [key, value]
          );
        }
      }

      await client.query('COMMIT');
      return { success: true, message: 'Settings updated successfully' };
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }
}

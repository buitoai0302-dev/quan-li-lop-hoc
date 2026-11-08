import { ERROR_CODES } from '../utils/constants';
import pool from '../db';
import { ValidationError } from '../utils/errors';
import { EDITABLE_SYSTEM_SETTING_KEYS, PUBLIC_SYSTEM_SETTING_KEYS } from '../utils/system-settings';

export class SystemService {
  static async getPublicSettings() {
    const result = await pool.query(
      'SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ANY($1)',
      [PUBLIC_SYSTEM_SETTING_KEYS]
    );

    const publicSettings = result.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});
    if (publicSettings.LEGAL_PUBLISHED !== 'true') {
      delete publicSettings.PRIVACY_POLICY_VI;
      delete publicSettings.PRIVACY_POLICY_EN;
      delete publicSettings.TERMS_OF_SERVICE_VI;
      delete publicSettings.TERMS_OF_SERVICE_EN;
    }
    return publicSettings;
  }

  static async getAdminSettings() {
    const result = await pool.query(
      'SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ANY($1)',
      [PUBLIC_SYSTEM_SETTING_KEYS]
    );
    return result.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});
  }

  static async updateSettings(settings: any) {
    if (
      typeof settings !== 'object' ||
      settings === null ||
      Array.isArray(settings) ||
      Object.keys(settings).length === 0 ||
      Object.entries(settings).some(
        ([key, value]) => !EDITABLE_SYSTEM_SETTING_KEYS.has(key) || typeof value !== 'string'
      )
    ) {
      throw new ValidationError('Invalid payload', ERROR_CODES.INVALID_DATA);
    }

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const legalKeys = [
        'LEGAL_PUBLISHED',
        'LEGAL_ENTITY_NAME',
        'LEGAL_EFFECTIVE_DATE',
        'CONTACT_EMAIL',
        'CONTACT_ADDRESS',
        'PRIVACY_POLICY_VI',
        'PRIVACY_POLICY_EN',
        'TERMS_OF_SERVICE_VI',
        'TERMS_OF_SERVICE_EN',
      ];
      const existing = await client.query(
        'SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ANY($1)',
        [legalKeys]
      );
      const merged: Record<string, string> = Object.fromEntries(
        existing.rows.map((row) => [row.setting_key, row.setting_value])
      );
      Object.assign(merged, settings);
      if (
        merged.LEGAL_PUBLISHED === 'true' &&
        legalKeys.slice(1).some((key) => !merged[key]?.trim())
      ) {
        throw new ValidationError(
          'Complete legal operator, contact and both language policies before publishing',
          ERROR_CODES.INVALID_DATA
        );
      }

      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO system_settings (setting_key, setting_value) 
             VALUES ($1, $2) 
             ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()`,
          [key, value]
        );
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

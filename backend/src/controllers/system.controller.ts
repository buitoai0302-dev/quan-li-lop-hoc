import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getPublicSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = result.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    // We send all of them as public for now since they are just branding/contact info
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const getAdminSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value, description FROM system_settings'
    );
    const settings = result.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = req.body; // e.g. { ZALO_CONTACT_LINK: '...', SYSTEM_NAME: '...' }

    if (typeof settings !== 'object' || settings === null) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    await pool.query('BEGIN');

    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'string') {
        await pool.query(
          `INSERT INTO system_settings (setting_key, setting_value) 
           VALUES ($1, $2) 
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()`,
          [key, value]
        );
      }
    }

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
};

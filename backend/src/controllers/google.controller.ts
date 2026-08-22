import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { getAuthUrl, handleCallback, syncAllSessionsToGoogle } from '../services/google.service';
import pool from '../db';

import jwt from 'jsonwebtoken';

import { config } from '../utils/config';

export const googleAuthUrl = (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Sign the state to prevent CSRF
  const state = jwt.sign({ userId }, config.jwtSecret(), { expiresIn: '15m' });

  const url = getAuthUrl(state);
  res.json({ url });
};

export const googleCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || !state || typeof state !== 'string') {
    return res.status(400).send('Invalid callback parameters');
  }

  try {
    // Verify the signed state
    const decoded = jwt.verify(state, config.jwtSecret()) as { userId: string };
    const userId = decoded.userId;

    await handleCallback(code as string, userId);
    // Sau khi lưu token xong, redirect về frontend setting page
    const frontendUrl = config.frontendUrl();
    res.redirect(`${frontendUrl}/settings?google_sync=success`);
  } catch (error) {
    logger.error(error, 'Google callback error:');
    res.status(500).send('Lỗi khi kết nối Google Calendar');
  }
};

export const disconnectGoogle = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await pool.query(
      'UPDATE users SET google_access_token = NULL, google_refresh_token = NULL, google_calendar_id = NULL WHERE id = $1',
      [userId]
    );
    res.json({ message: 'Đã ngắt kết nối Google Calendar' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const syncAll = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const tenantId = (req as any).user?.tenantId;
  const userRole = (req as any).user?.role;

  logger.info(`[GoogleSync] Request from user ${userId}, role: ${userRole}, tenantId: ${tenantId}`);

  if (!userId || !tenantId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const count = await syncAllSessionsToGoogle(userId, tenantId);
    res.json({ message: `Đã đồng bộ thành công ${count} buổi học lên Google Calendar`, count });
  } catch (error: any) {
    logger.error(error, 'Sync all error:');
    res.status(500).json({ error: error.message || 'Lỗi khi đồng bộ dữ liệu' });
  }
};

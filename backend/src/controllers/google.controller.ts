import { Request, Response } from 'express';
import { getAuthUrl, handleCallback } from '../services/google.service';
import pool from '../db';

export const googleAuthUrl = (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const url = getAuthUrl(userId);
  res.json({ url });
};

export const googleCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const userId = state as string;

  if (!code || !userId) {
    return res.status(400).send('Invalid callback');
  }

  try {
    await handleCallback(code as string, userId);
    // Sau khi lưu token xong, redirect về frontend setting page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?google_sync=success`);
  } catch (error) {
    console.error('Google callback error:', error);
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

import { Response, NextFunction } from 'express';

import { AuthRequest } from '../middlewares/auth.middleware';
import { NotificationService } from '../services/notification.service';

export const registerToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    const userId = (req.user as any)?.userId;

    if (!token || !userId) {
      return res.status(400).json({ message: 'Token and User ID are required' });
    }

    await NotificationService.registerToken(userId, token);
    res.json({ message: 'Token registered successfully' });
  } catch (error) {
    next(error);
  }
};

export const unregisterToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    await NotificationService.unregisterToken(token);
    res.json({ message: 'Token unregistered successfully' });
  } catch (error) {
    next(error);
  }
};

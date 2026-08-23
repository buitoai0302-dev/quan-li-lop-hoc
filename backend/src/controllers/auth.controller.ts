import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ValidationError, AuthenticationError } from '../utils/errors';

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    if (!email || !password) {
      return next(new ValidationError('Missing email or password', 'MISSING_REQUIRED_FIELDS'));
    }

    const { accessToken, refreshToken, user } = await AuthService.login(email, password, ip);

    setRefreshCookie(res, refreshToken);
    res.json({ token: accessToken, user });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return next(new ValidationError('Missing Google credential', 'MISSING_REQUIRED_FIELDS'));
    }

    const { accessToken, refreshToken, user } = await AuthService.googleLogin(credential);

    setRefreshCookie(res, refreshToken);
    res.json({ token: accessToken, user });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, tenantName } = req.body;

    if (!email || !password || !fullName) {
      return next(new ValidationError('Missing fields', 'MISSING_REQUIRED_FIELDS'));
    }

    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return next(new ValidationError('Invalid token', 'INVALID_TOKEN'));
    }

    const result = await AuthService.verifyEmail(token);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    if (!email) {
      return next(new ValidationError('Email required', 'MISSING_REQUIRED_FIELDS'));
    }

    const result = await AuthService.resendVerification(email, ip);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    if (!email) {
      return next(new ValidationError('Email required', 'MISSING_REQUIRED_FIELDS'));
    }

    const result = await AuthService.forgotPassword(email, ip);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return next(new ValidationError('Missing token or password', 'MISSING_REQUIRED_FIELDS'));
    }

    const result = await AuthService.resetPassword(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) throw new AuthenticationError();

    const user = await AuthService.getMe(userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const user = await AuthService.updateMe(userId, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const completeOnboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const result = await AuthService.completeOnboarding(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token)
      return next(new ValidationError('Refresh token required', 'MISSING_REQUIRED_FIELDS'));

    const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshToken(token);

    setRefreshCookie(res, newRefreshToken);
    res.json({ token: accessToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    const result = await AuthService.logout(token);

    res.clearCookie('refreshToken', { path: '/' });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

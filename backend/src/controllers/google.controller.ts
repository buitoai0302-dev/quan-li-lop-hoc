import { logger } from '../utils/logger';
import { type Response, type NextFunction, type CookieOptions } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { syncAllSessionsToGoogle } from '../services/google.service';
import { GoogleSyncService } from '../services/google-sync.service';
import {
  createGoogleSyncJobSchema,
  retryGoogleSyncJobSchema,
} from '../validators/google-sync.validator';
import {
  startGoogleConnection,
  completeGoogleConnection,
  disconnectGoogleConnection,
  GOOGLE_OAUTH_LIFETIME_MS,
} from '../services/google-oauth.service';
import { config } from '../utils/config';
import { ERROR_CODES } from '../utils/constants';
import { AppError, AuthenticationError } from '../utils/errors';

const GOOGLE_OAUTH_COOKIE = 'eduschedule_google_oauth';
const oauthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/google',
});

export const googleAuthUrl = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AuthenticationError();
    const { url, browserNonce } = await startGoogleConnection(req.user);
    res.cookie(GOOGLE_OAUTH_COOKIE, browserNonce, {
      ...oauthCookieOptions(),
      maxAge: GOOGLE_OAUTH_LIFETIME_MS,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ url });
  } catch (error) {
    next(error);
  }
};

export const googleCallback = async (req: AuthRequest, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.clearCookie(GOOGLE_OAUTH_COOKIE, oauthCookieOptions());
  try {
    await completeGoogleConnection(
      req.query.code,
      req.query.state,
      req.cookies?.[GOOGLE_OAUTH_COOKIE]
    );
    res.redirect(`${config.frontendUrl()}/settings?google_sync=success`);
  } catch (error) {
    const code =
      error instanceof AppError && error.errorCode === ERROR_CODES.GOOGLE_OAUTH_INVALID_STATE
        ? ERROR_CODES.GOOGLE_OAUTH_INVALID_STATE
        : ERROR_CODES.GOOGLE_CONNECTION_FAILED;
    // Provider errors may contain authorization codes/client secrets. Log metadata only.
    logger.warn({ operation: 'GOOGLE_OAUTH_CALLBACK_FAILED', code }, 'Google connection rejected');
    res.redirect(`${config.frontendUrl()}/settings?google_sync=error&code=${code}`);
  }
};

export const disconnectGoogle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AuthenticationError();
    await disconnectGoogleConnection(req.user.userId, req.user.tenantId);
    res.json({ message: 'Đã ngắt kết nối Google Calendar' });
  } catch (error) {
    next(error);
  }
};

export const syncAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AuthenticationError();
    const job = await syncAllSessionsToGoogle(req.user.userId, req.user.tenantId);
    const progress = await GoogleSyncService.progress(req.user.tenantId, req.user.userId, job.id);
    res.status(202).json({
      message: 'Đã xếp hàng đồng bộ Google Calendar',
      count: 0,
      jobId: job.id,
      queuedCount: progress.total,
    });
  } catch (error) {
    next(error);
  }
};

export const createSyncJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AuthenticationError();
    const body = createGoogleSyncJobSchema.parse({ body: req.body || {} }).body;
    res
      .status(202)
      .json(await GoogleSyncService.createJob(req.user.tenantId, req.user.userId, body.requestId));
  } catch (error) {
    next(error);
  }
};
export const syncProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AuthenticationError();
    res.json(
      await GoogleSyncService.progress(
        req.user.tenantId,
        req.user.userId,
        req.params.id as string | undefined
      )
    );
  } catch (error) {
    next(error);
  }
};
export const retrySyncJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AuthenticationError();
    const body = retryGoogleSyncJobSchema.parse({ body: req.body || {} }).body;
    res
      .status(202)
      .json(
        await GoogleSyncService.retry(
          req.user.tenantId,
          req.user.userId,
          req.params.id as string | undefined,
          body.confirmLegacy
        )
      );
  } catch (error) {
    next(error);
  }
};

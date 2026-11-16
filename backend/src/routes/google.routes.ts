import { Router } from 'express';
import {
  googleAuthUrl,
  googleCallback,
  disconnectGoogle,
  syncAll,
  createSyncJob,
  syncProgress,
  retrySyncJob,
} from '../controllers/google.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ACCESS } from '../utils/permissions';
import { validate, validateUUID } from '../middlewares/validate.middleware';
import {
  createGoogleSyncJobSchema,
  retryGoogleSyncJobSchema,
} from '../validators/google-sync.validator';

const router = Router();

router.get('/url', authMiddleware, googleAuthUrl);
router.get('/callback', googleCallback);
router.delete('/disconnect', authMiddleware, disconnectGoogle);
router.post('/sync-all', authMiddleware, requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT), syncAll);
router.post(
  '/sync-jobs',
  authMiddleware,
  requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT),
  validate(createGoogleSyncJobSchema),
  createSyncJob
);
router.get(
  '/sync-jobs',
  authMiddleware,
  requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT),
  syncProgress
);
router.post(
  '/sync-jobs/retry',
  authMiddleware,
  requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT),
  validate(retryGoogleSyncJobSchema),
  retrySyncJob
);
router.get(
  '/sync-jobs/:id',
  authMiddleware,
  requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT),
  validateUUID(['id']),
  syncProgress
);
router.post(
  '/sync-jobs/:id/retry',
  authMiddleware,
  requireRole(ACCESS.ADMIN_STAFF_TEACHER_STUDENT),
  validateUUID(['id']),
  validate(retryGoogleSyncJobSchema),
  retrySyncJob
);

export default router;

import { Router } from 'express';
import { registerToken, unregisterToken } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/register-token', registerToken as any);
router.post('/unregister-token', unregisterToken as any);

export default router;

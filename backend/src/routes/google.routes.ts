import { Router } from 'express';
import { googleAuthUrl, googleCallback, disconnectGoogle } from '../controllers/google.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/url', authMiddleware, googleAuthUrl);
router.get('/callback', googleCallback);
router.delete('/disconnect', authMiddleware, disconnectGoogle);

export default router;

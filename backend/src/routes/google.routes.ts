import { Router } from 'express';
import { googleAuthUrl, googleCallback, disconnectGoogle, syncAll } from '../controllers/google.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/url', authMiddleware, googleAuthUrl);
router.get('/callback', googleCallback);
router.delete('/disconnect', authMiddleware, disconnectGoogle);
router.post('/sync-all', authMiddleware, syncAll);

export default router;

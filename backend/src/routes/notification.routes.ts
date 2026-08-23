import { Router } from 'express';
import { registerToken, unregisterToken } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const tokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token không được để trống'),
  }),
});

router.use(authMiddleware);

router.post('/register-token', validate(tokenSchema), registerToken as any);
router.post('/unregister-token', validate(tokenSchema), unregisterToken as any);

export default router;

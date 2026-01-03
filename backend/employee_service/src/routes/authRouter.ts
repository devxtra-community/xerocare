import { Router } from 'express';
import {
  login,
  logout,
  refresh,
  changePassword,
  loginVerify,
  forgotPassword,
  resetPassword,
  requestMagicLink,
  verifyMagicLink,
  logoutOtherDevices,
  getSessions,
  logoutSession,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { redisRateLimiter } from '../middleware/rateLimit';

const authRouter = Router();

const rateLimit = redisRateLimiter({
  keyPrefix: 'auth:normal',
  windowSec: 60,
  max: 5,
});

authRouter.post('/login', login);
authRouter.post('/login/verify', rateLimit, loginVerify);
authRouter.post('/refresh', rateLimit, refresh);
authRouter.post('/logout', rateLimit, logout);
authRouter.post('/change-password', rateLimit, changePassword);
authRouter.post('/forgot-password', rateLimit, forgotPassword);
authRouter.post('/forgot-password/verify', rateLimit, resetPassword);
authRouter.post('/magic-link', rateLimit, requestMagicLink);
authRouter.post('/magic-link/verify', rateLimit, verifyMagicLink);
authRouter.post('/logout-other-devices', authMiddleware, logoutOtherDevices);
authRouter.get('/sessions', authMiddleware, getSessions);
authRouter.post('/sessions/logout', authMiddleware, logoutSession);

export default authRouter;

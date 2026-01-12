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
  getMe,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/login/verify', loginVerify);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/change-password', changePassword);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/forgot-password/verify', resetPassword);
authRouter.post('/magic-link', requestMagicLink);
authRouter.post('/magic-link/verify', verifyMagicLink);
authRouter.post('/logout-other-devices', authMiddleware, logoutOtherDevices);
authRouter.get('/sessions', authMiddleware, getSessions);
authRouter.post('/sessions/logout', authMiddleware, logoutSession);
authRouter.get('/me', authMiddleware, getMe);

export default authRouter;

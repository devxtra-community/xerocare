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

/**
 * This file handles the "Security Gate" of our system.
 * It manages how staff log in, stay logged in, and keep their accounts secure.
 */
const authRouter = Router();

// --- 1. Logging In and Identity ---

/**
 * Standard login with username and password.
 */
authRouter.post('/login', login);

/**
 * If we need a second step (like a code sent to a phone), this confirms it.
 */
authRouter.post('/login/verify', loginVerify);

/**
 * This helps the computer remember the staff member so they don't
 * have to keep typing their password every few minutes.
 */
authRouter.post('/refresh', refresh);

/**
 * Safely exit the system and clear all security keys.
 */
authRouter.post('/logout', logout);

/**
 * Who am I? Get the details of the staff member currently logged in.
 */
authRouter.get('/me', authMiddleware, getMe);

// --- 2. Passwords and Security ---

/**
 * Change the current password to a new one.
 */
authRouter.post('/change-password', authMiddleware, changePassword);

/**
 * If a staff member forgot their password, this starts the recovery process.
 */
authRouter.post('/forgot-password', forgotPassword);

/**
 * Confirm and set the new password after starting the recovery process.
 */
authRouter.post('/forgot-password/verify', resetPassword);

// --- 3. Easy Login (Magic Links) ---

/**
 * Send a "Magic Link" to a staff member's email so they can log in
 * with one click—no password needed.
 */
authRouter.post('/magic-link', requestMagicLink);

/**
 * Confirm the click from a Magic Link to finish logging in.
 */
authRouter.post('/magic-link/verify', verifyMagicLink);

// --- 4. Advanced Security (Sessions) ---

/**
 * Log out of every computer or phone except the one currently being used.
 * Useful if a phone is lost or stolen.
 */
authRouter.post('/logout-other-devices', authMiddleware, logoutOtherDevices);

/**
 * Show a list of all computers and phones currently logged into this account.
 */
authRouter.get('/sessions', authMiddleware, getSessions);

/**
 * Log out one specific device from the list of active sessions.
 */
authRouter.post('/sessions/logout', authMiddleware, logoutSession);

export default authRouter;

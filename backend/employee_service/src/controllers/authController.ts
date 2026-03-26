import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { AuthService } from '../services/authService';
import { issueTokens } from '../services/tokenService';
import { OtpService } from '../services/otpService';
import { OtpPurpose } from '../constants/otpPurpose';
import { MagicLinkService } from '../services/magicLinkService';
import { logger } from '../config/logger';

const authService = new AuthService();
const otpService = new OtpService();
const magicLinkService = new MagicLinkService();

interface AuthError {
  message?: string;
  statusCode?: number;
}

/**
 * First step of Logging In:
 * The staff member enters their email and password. If correct, our
 * system sends a secret 6-digit security code (OTP) to their email
 * for safety.
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = await authService.login(req.body);

    otpService
      .sendOtp(user.email, OtpPurpose.LOGIN)
      .then(() => logger.info(`OTP sent successfully to ${user.email} for login`))
      .catch((err) =>
        logger.error(`Failed to send OTP to ${user.email}: ${err.message}`, { error: err }),
      );

    return res.json({
      message: 'Otp sent to registered email',
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Second step of Logging In:
 * The staff member enters the secret 6-digit code we sent to their email.
 * If the code matches, we officially open the office doors for them
 * (give them access).
 */
export const loginVerify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const otp = req.body.otp.trim();

    await otpService.verifyOtp(email, otp, OtpPurpose.LOGIN);

    const user = await authService.findUserByEmail(email);

    const accessToken = await issueTokens(user, req, res);
    logger.info('login successfull');

    return res.json({
      message: 'Login successfull',
      accessToken,
      data: user,
      success: true,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Bad Request', error.statusCode || 400));
  }
};

/**
 * Keep me logged in:
 * This helps the staff member's computer remember who they are so
 * they don't have to keep logging back in throughout the day.
 */
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const user = await authService.refresh(refreshToken);

    const accessToken = await issueTokens(user, req, res);

    return res.json({
      message: 'Access token refreshed',
      accessToken,
      success: true,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Invalid refresh token', error.statusCode || 401));
  }
};

/**
 * Safely exit the system:
 * This tells the system that the staff member is leaving and all
 * active security keys should be disabled.
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);

    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    res.json({ message: 'logout successfull', success: true });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Internal server error', error.statusCode || 500));
  }
};

/**
 * Change Security Password:
 * Allows a staff member to set a new password, providing they know
 * their current one.
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword({
      userId,
      currentPassword,
      newPassword,
    });

    return res.status(200).json({ message: 'Password changed successfully', success: true });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Internal server error', error.statusCode || 500));
  }
};

/**
 * Forgotten Password:
 * If a staff member can't remember their password, we send them a
 * security code to their email so they can reset it.
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email.toLowerCase().trim();

    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.json({
        message: 'If account exists, magic link sent',
        success: true,
      });
    }

    await otpService.sendOtp(email, OtpPurpose.FORGOT_PASSWORD);

    return res.json({
      message: 'If account exists, magic link sent',
      success: true,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Bad Request', error.statusCode || 400));
  }
};

/**
 * Resetting the Password:
 * After receiving the security code via email, the staff member
 * can finally set their new password.
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const otp = String(req.body.otp).trim();
    const { newPassword } = req.body;
    const currentRefreshToken = req.cookies.refreshToken;

    await otpService.verifyOtp(email, otp, OtpPurpose.FORGOT_PASSWORD);

    const user = await authService.findUserByEmail(email);

    await authService.resetPassword(user.id, newPassword);

    if (currentRefreshToken) {
      await authService.logoutOtherDevices(user.id, currentRefreshToken);
    }

    return res.json({
      message: 'Password reset successfully',
      success: true,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Bad Request', error.statusCode || 400));
  }
};

/**
 * Request a "Magic Link":
 * Send a special email containing a "one-click" login button.
 * No password required—it's fast and secure.
 */
export const requestMagicLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email.toLowerCase().trim();

    await magicLinkService.sendMagicLink(email);

    return res.json({
      message: 'If account exists, magic link sent',
      success: true,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Bad Request', error.statusCode || 400));
  }
};

/**
 * Verify "Magic Link":
 * Confirm that the staff member actually clicked the link we sent to
 * their email and log them in immediately.
 */
export const verifyMagicLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body.token.trim();

    const email = await magicLinkService.verifyMagicLink(token);

    const user = await authService.findUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = await issueTokens(user, req, res);

    return res.json({
      message: 'Login successful',
      accessToken,
      data: user,
      success: true,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Bad Request', error.statusCode || 400));
  }
};

/**
 * Stop other devices:
 * If a staff member thinks their account might be open on a different
 * computer (like a public one), they can use this to remotely log
 * out every other device.
 */
export const logoutOtherDevices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;
    const currentRefreshToken = req.cookies.refreshToken;

    if (!currentRefreshToken) {
      return next(new AppError('No refresh token found', 400));
    }

    await authService.logoutOtherDevices(userId, currentRefreshToken);

    return res.json({
      message: 'Logged out from other devices',
      success: true,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Internal server error', error.statusCode || 500));
  }
};

/**
 * See active sessions:
 * List all the phones and computers currently logged into this account
 * (e.g., "Logged in via Chrome on Windows").
 */
export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;
    const currentToken = req.cookies.refreshToken;
    const isAdmin = req.user.role === 'ADMIN';

    const sessions = await authService.getSessions(userId, currentToken, isAdmin);

    return res.json({
      data: sessions,
      success: true,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Internal Server Error', error.statusCode || 500));
  }
};

/**
 * Log out a specific device:
 * Pick one phone or computer from the "active sessions" list and force
 * it to log out.
 */
export const logoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.body;

    await authService.logoutSession(userId, sessionId);

    return res.json({
      message: 'Session logged out',
      success: true,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Internal Server Error', error.statusCode || 500));
  }
};

/**
 * Get My Profile:
 * Retrieve the basic details (name, role, branch) for the staff member
 * currently using the system.
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId || req.user.id;
    if (!userId) {
      throw new AppError('User ID not found in token', 400);
    }
    const role = req.user.role;
    const user = await authService.findUserById(userId, role);
    return res.json({
      success: true,
      data: user,
    });
  } catch (err: unknown) {
    const error = err as AuthError;
    next(new AppError(error.message || 'Internal Server Error', error.statusCode || 500));
  }
};

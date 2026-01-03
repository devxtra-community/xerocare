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

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = await authService.login(req.body);

    await otpService.sendOtp(user.email, OtpPurpose.LOGIN);

    return res.json({
      message: 'Otp sent to registered email',
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 500));
  }
};

export const loginVerify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const otp = req.body.otp.trim();

    await otpService.verifyOtp(email, otp, OtpPurpose.LOGIN);

    const user = await authService.findUserByEmail(email);

    const accessToken = await issueTokens(user, req, res);
    logger.info("login successfull")

    return res.json({
      message: 'Login successfull',
      accessToken,
      data: user,
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 400));
  }
};

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
  } catch (err: any) {
    next(new AppError(err.message || 'Invalid refresh token', err.statusCode || 401));
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);

    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    res.json({ message: 'logout successfull', success: true });
  } catch (err: any) {
    next(new AppError(err.message || 'Internal server error', err.statusCode || 500));
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword({
      userId,
      currentPassword,
      newPassword,
    });

    return res.status(200).json({ message: 'Password changed successfully', success: true });
  } catch (err: any) {
    next(new AppError(err.message || 'Internal server error', err.statusCode || 500));
  }
};

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
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 400));
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const otp = String(req.body.otp).trim();
    const { newPassword } = req.body;
    const userId = req.user.id;
    const currentRefreshToken = req.cookies.refreshToken;

    await otpService.verifyOtp(email, otp, OtpPurpose.FORGOT_PASSWORD);

    const user = await authService.findUserByEmail(email);

    await authService.resetPassword(user.id, newPassword);

    await authService.logoutOtherDevices(userId, currentRefreshToken);

    return res.json({
      message: 'Password reset successfully',
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 400));
  }
};

export const requestMagicLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email.toLowerCase().trim();

    await magicLinkService.sendMagicLink(email);

    return res.json({
      message: 'If account exists, magic link sent',
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 400));
  }
};

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
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 400));
  }
};

export const logoutOtherDevices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const currentRefreshToken = req.cookies.refreshToken;

    if (!currentRefreshToken) {
      return next(new AppError('No refresh token found', 400));
    }

    await authService.logoutOtherDevices(userId, currentRefreshToken);

    return res.json({
      message: 'Logged out from other devices',
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message || 'Internal server error', err.statusCode || 500));
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const currentToken = req.cookies.refreshToken;

    const sessions = await authService.getSessions(userId, currentToken);

    return res.json({
      data: sessions,
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 500));
  }
};

export const logoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;

    await authService.logoutSession(userId, sessionId);

    return res.json({
      message: 'Session logged out',
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 500));
  }
};

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { AdminService } from '../services/adminService';
import { AuthService } from '../services/authService';
import { issueTokens } from '../services/tokenService';
import { Source } from '../config/dataSource';
import { Admin } from '../entities/adminEntities';
import { REFRESH_COOKIE_NAME, clearCookieOptions } from '../config/cookieOptions';

const adminService = new AdminService();
const authService = new AuthService();

export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admin = await adminService.login(req.body);

    const accessToken = await issueTokens(admin, req, res);

    return res.json({
      message: 'Admin login successfully',
      accessToken,
      data: admin,
      success: true,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    next(new AppError(err.message || 'Internal Server Error', err.statusCode || 500));
  }
};

// Admin accounts live in their own table, not as Employee rows with
// role='ADMIN' — cross-service "notify all Admins" lookups (e.g.
// billing_service's findAllAdmins()) need a real way to reach them, since
// GET /employee?role=ADMIN always returns nothing.
export const listAdmins = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admins = await Source.getRepository(Admin).find({ select: ['id', 'email'] });
    res.json({ success: true, data: admins });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    next(new AppError(err.message || 'Internal Server Error', err.statusCode || 500));
  }
};

export const adminLogout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions);
    res.json({
      message: 'Admin logout successful',
      success: true,
      isAdmin: true,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };
    next(new AppError(err.message || 'Internal Server Error', err.statusCode || 500));
  }
};

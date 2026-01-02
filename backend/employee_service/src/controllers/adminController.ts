import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError";
import { AdminService } from "../services/adminService";
import { AuthService } from "../services/authService";
import { issueTokens } from "../services/tokenService";

const adminService = new AdminService();
const authService = new AuthService();

export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admin = await adminService.login(req.body);

    const accessToken = await issueTokens(admin, req, res);

    return res.json({
      message: "Admin login successfully",
      accessToken,
      data: admin,
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 500));
  }
};

export const adminLogout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);
    res.clearCookie("refreshToken");
    res.json({
      message: "Admin logout successful",
      success: true,
      isAdmin: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 500));
  }
};

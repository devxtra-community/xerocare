import { Request, Response } from "express";
import { AdminAuthService } from "../services/adminService";
import { AuthService } from "../services/authService";

const adminAuthService = new AdminAuthService();
const authService = new AuthService();

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { admin, accessToken, refreshToken } = await adminAuthService.login(req.body);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Admin login successfully",
      accessToken,
      data: admin,
      success: true,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err.message || "Internal server error",
      success: false,
    });
  }
};

export const adminLogout = async (req:Request, res:Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);
    res.clearCookie("refreshToken");
    res.json({ message: "Admin logout successful", success: true });
  } 
  catch (err: any) {
    return res.status(500).json({
      message: err.message || "Internal server error",
      success: false,
    });
  }
};

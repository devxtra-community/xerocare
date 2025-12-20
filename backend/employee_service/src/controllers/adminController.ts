import { Request, Response } from "express";
import { AdminService } from "../services/adminService";
import { AuthService } from "../services/authService";
import { issueTokens } from "../services/tokenService";

const adminService = new AdminService();
const authService = new AuthService();

export const adminLogin = async (req:Request, res:Response) => {
  try {
    const admin = await adminService.login(req.body);

    const accessToken = await issueTokens(admin,req,res);

    return res.json({
      message: "Admin login successfully",
      accessToken,
      data: admin,
      success: true
    });

  } catch (err:any) {
    return res.status(500).json({ message: err.message, success: false });
  }
};


export const adminLogout = async (req:Request, res:Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);
    res.clearCookie("refreshToken");
    res.json({ message: "Admin logout successful", success: true, isAdmin:true });
  } 
  catch (err: any) {
    return res.status(500).json({
      message: err.message || "Internal server error",
      success: false,
    });
  }
};

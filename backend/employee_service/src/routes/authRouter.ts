import { Router } from "express";
import { login, logout, refresh,changePassword, loginVerify, forgotPassword, resetPassword, requestMagicLink, verifyMagicLink, logoutOtherDevices, getSessions, logoutSession } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";
import {otpRequestLimiter,otpVerifyLimiter,loginLimiter} from "../middleware/rateLimit";

const authRouter = Router();

authRouter.post("/login",loginLimiter, login);
authRouter.post("/login/verify",otpVerifyLimiter,loginVerify)
authRouter.post("/refresh",authMiddleware, refresh);
authRouter.post("/logout",authMiddleware,logout);
authRouter.post("/change-password",authMiddleware,changePassword)
authRouter.post("/forgot-password",otpRequestLimiter, forgotPassword);
authRouter.post("/forgot-password/verify",otpVerifyLimiter, resetPassword);
authRouter.post("/magic-link",otpRequestLimiter, requestMagicLink);
authRouter.post("/magic-link/verify",otpVerifyLimiter, verifyMagicLink);
authRouter.post("/logout-other-devices",authMiddleware,logoutOtherDevices);
authRouter.get("/sessions",authMiddleware,getSessions);
authRouter.post("/sessions/logout",authMiddleware,logoutSession)

export default authRouter;
import { Router } from "express";
import { login, logout, refresh,changePassword, loginVerify, forgotPassword, resetPassword } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/login/verify",loginVerify)
authRouter.post("/refresh",authMiddleware, refresh);
authRouter.post("/logout",authMiddleware,logout);
authRouter.post("/change-password",authMiddleware,changePassword)
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/forgot-password/verify", resetPassword);


export default authRouter;
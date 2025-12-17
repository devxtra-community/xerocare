import { Router } from "express";
import { login, logout, refresh } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/refresh",authMiddleware, refresh);
authRouter.post("/logout",authMiddleware,logout);

export default authRouter;
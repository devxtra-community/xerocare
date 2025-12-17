import { Router } from "express";
import { adminLogin, adminLogout } from "../controllers/adminAuthController";

const adminAuthRouter = Router();

adminAuthRouter.post("/login", adminLogin);
adminAuthRouter.post("/logout", adminLogout);


export default adminAuthRouter;

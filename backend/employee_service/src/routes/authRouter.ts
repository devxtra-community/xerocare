import { Router } from "express";
import { verifyAuthentication } from "../controllers/auth.Controller";


const authRouter = Router();
authRouter.post("/verify", verifyAuthentication);


export default authRouter;
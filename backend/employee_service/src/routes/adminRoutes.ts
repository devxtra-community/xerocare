import { Router } from "express";
import { addEmployee } from "../controllers/adminController";

const adminRouter = Router();

adminRouter.post("/employee",addEmployee);

export default adminRouter;
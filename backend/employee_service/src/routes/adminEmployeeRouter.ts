import { Router } from "express";
import { addEmployee } from "../controllers/adminEmployeeController";

const adminEmployeeRouter = Router();

adminEmployeeRouter.post("/employee",addEmployee);

export default adminEmployeeRouter;
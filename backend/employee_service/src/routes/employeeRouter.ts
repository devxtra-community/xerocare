import { Router } from "express";
import { addEmployee } from "../controllers/employeeController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

const employeeRouter = Router();

employeeRouter.use(authMiddleware);
employeeRouter.post("/create",requireRole("ADMIN","HR"),addEmployee);

export default employeeRouter;
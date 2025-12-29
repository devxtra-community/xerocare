import { Router } from "express";
import { addEmployee, getAllEmployees, getEmployeeById, getEmployeeIdProof } from "../controllers/employeeController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { uploadEmployeeFiles } from "../middleware/uploadEmployeeFiles";

const employeeRouter = Router();

employeeRouter.use(authMiddleware);

employeeRouter.post("/create",requireRole("ADMIN", "HR"),
  uploadEmployeeFiles.fields([
    { name: "profile_image", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
  ]),
  addEmployee
);

employeeRouter.get("/:id/id-proof",authMiddleware,requireRole("ADMIN", "HR"),getEmployeeIdProof);

employeeRouter.get("/",requireRole("ADMIN","HR"),getAllEmployees)
employeeRouter.get("/:id",requireRole("ADMIN","HR"),getEmployeeById)

export default employeeRouter;

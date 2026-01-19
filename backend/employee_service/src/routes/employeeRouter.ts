import { Router } from 'express';
import {
  addEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployeeById,
  getEmployeeIdProof,
  updateEmployee,
  getHRStats,
} from '../controllers/employeeController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { uploadEmployeeFiles } from '../middleware/uploadEmployeeFiles';

const employeeRouter = Router();

employeeRouter.use(authMiddleware);

employeeRouter.post(
  '/create',
  requireRole('ADMIN', 'HR'),
  uploadEmployeeFiles.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'id_proof', maxCount: 1 },
  ]),
  addEmployee,
);

employeeRouter.get('/:id/id-proof', authMiddleware, requireRole('ADMIN', 'HR'), getEmployeeIdProof);

employeeRouter.get('/stats', requireRole('ADMIN', 'HR'), getHRStats);

employeeRouter.get('/', requireRole('ADMIN', 'HR'), getAllEmployees);
employeeRouter.get('/:id', requireRole('ADMIN', 'HR'), getEmployeeById);
employeeRouter.put(
  '/:id',
  requireRole('ADMIN', 'HR'),
  uploadEmployeeFiles.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'id_proof', maxCount: 1 },
  ]),
  updateEmployee,
);

employeeRouter.delete('/:id', requireRole('ADMIN', 'HR'), deleteEmployee);

export default employeeRouter;

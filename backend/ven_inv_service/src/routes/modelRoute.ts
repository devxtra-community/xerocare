import { Router } from 'express';
import {
  addModel,
  deleteModel,
  editModel,
  getallModels,
  syncQuantities,
  getModelById,
} from '../controllers/modelController';

import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware, requireServiceRole } from '../middlewares/roleMiddleware';

const modelRoute = Router();

modelRoute.get('/', authMiddleware, getallModels);
modelRoute.get('/:id', authMiddleware, getModelById);
// Same reasoning as brandRoute.ts's createBrand: additive, low-risk, and a
// routine sub-step of registering an external machine for a service ticket
// or contract — scoped to the jobs that actually hit that flow rather than
// opened to every employee.
modelRoute.post(
  '/',
  authMiddleware,
  requireServiceRole(['SERVICE_TECHNICIAN', 'SERVICE_HELP_DESK']),
  addModel,
);
modelRoute.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), editModel);
modelRoute.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), deleteModel);
modelRoute.post(
  '/sync-quantities',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  syncQuantities,
);

export default modelRoute;

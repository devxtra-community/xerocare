import { Router } from 'express';
import {
  addModel,
  deleteModel,
  editModel,
  getallModels,
  syncQuantities,
} from '../controllers/modelController';

import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const modelRoute = Router();

modelRoute.get('/', authMiddleware, getallModels);
modelRoute.post('/', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), addModel);
modelRoute.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), editModel);
modelRoute.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), deleteModel);
modelRoute.post(
  '/sync-quantities',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  syncQuantities,
);

export default modelRoute;

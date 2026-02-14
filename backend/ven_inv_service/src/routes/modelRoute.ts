import { Router } from 'express';
import {
  addModel,
  deleteModel,
  editModel,
  getallModels,
  syncQuantities,
} from '../controllers/modelController';

const modelRoute = Router();

modelRoute.get('/', getallModels);
modelRoute.post('/', addModel);
modelRoute.put('/:id', editModel);
modelRoute.delete('/:id', deleteModel);
modelRoute.post('/sync-quantities', syncQuantities);

export default modelRoute;

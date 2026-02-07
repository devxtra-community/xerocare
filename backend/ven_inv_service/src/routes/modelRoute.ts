import { Router } from 'express';
import { addModel, deleteModel, editModel, getallModels } from '../controllers/modelController';

const modelRoute = Router();

modelRoute.get('/', getallModels);
modelRoute.post('/', addModel);
modelRoute.put('/:id', editModel);
modelRoute.delete('/:id', deleteModel);

export default modelRoute;

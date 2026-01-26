import { Router } from 'express';
import { getInventoryStats } from '../controllers/inventoryController';
const inventoryRouter = Router();

inventoryRouter.get('/status', getInventoryStats);

export default inventoryRouter;

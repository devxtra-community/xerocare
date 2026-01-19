import { Router } from 'express';
import { inventoryStatus } from '../controllers/inventoryController';
const inventoryRouter = Router();

inventoryRouter.get('/status', inventoryStatus);

export default inventoryRouter;

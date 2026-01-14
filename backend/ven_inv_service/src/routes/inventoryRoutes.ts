import { Router } from 'express';
import {
  getGlobalInventory,
  getBranchInventory,
  getWarehouseInventory,
  getInventoryStats,
} from '../controllers/inventoryController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const inventoryRouter = Router();

inventoryRouter.use(authMiddleware);

inventoryRouter.get('/', roleMiddleware(['ADMIN']), getGlobalInventory);
inventoryRouter.get('/branch', roleMiddleware(['MANAGER']), getBranchInventory);
inventoryRouter.get('/warehouse', getWarehouseInventory);
inventoryRouter.get('/stats', roleMiddleware(['ADMIN']), getInventoryStats);

export default inventoryRouter;

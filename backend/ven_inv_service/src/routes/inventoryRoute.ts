import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { InventoryController } from '../controllers/inventoryController';
import { Router } from 'express';

export const inventoryRoute = Router();
const controller = new InventoryController();

inventoryRoute.get('/', authMiddleware, roleMiddleware(['ADMIN']), controller.all);

inventoryRoute.get('/warehouse/:warehouseId', authMiddleware, controller.byWarehouse);
inventoryRoute.get(
  '/branch/:branchId',
  authMiddleware,
  roleMiddleware(['MANAGER']),
  controller.byBranch,
);
inventoryRoute.post(
  '/add',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  controller.addStock,
);

inventoryRoute.post(
  '/damage',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  controller.markDamaged,
);

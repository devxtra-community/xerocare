import { Router } from 'express';
import {
  getGlobalInventory,
  getBranchInventory,
  getWarehouseInventory,
  getInventoryStats,
} from '../controllers/inventoryController';
import { processInventoryReturn } from '../controllers/inventoryReturnController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  scanLookup,
  getProductBarcodePdf,
  getSparePartBarcodePdf,
} from '../controllers/barcodeController';

const inventoryRouter = Router();

inventoryRouter.use(authMiddleware);
inventoryRouter.get('/scan', scanLookup);
inventoryRouter.get(
  '/products/barcode-pdf',
  roleMiddleware(['ADMIN', 'MANAGER']),
  getProductBarcodePdf,
);
inventoryRouter.get(
  '/spare-parts/barcode-pdf',
  roleMiddleware(['ADMIN', 'MANAGER']),
  getSparePartBarcodePdf,
);
inventoryRouter.get('/', roleMiddleware(['ADMIN']), getGlobalInventory);
inventoryRouter.get('/branch', roleMiddleware(['MANAGER']), getBranchInventory);
inventoryRouter.get('/warehouse', getWarehouseInventory);
inventoryRouter.get('/stats', roleMiddleware(['ADMIN', 'MANAGER']), getInventoryStats);
inventoryRouter.post(
  '/returns/process',
  roleMiddleware(['ADMIN', 'MANAGER', 'SALES']),
  processInventoryReturn,
);

export default inventoryRouter;

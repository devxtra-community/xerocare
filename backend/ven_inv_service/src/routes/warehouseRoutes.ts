import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouseController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new WarehouseController();

router.post('/', controller.create);
router.get('/', controller.list);
router.get(
  '/my-branch',
  authMiddleware,
  roleMiddleware(['MANAGER']),
  controller.getMyBranchWarehouses,
);
router.get('/:id', controller.getOne);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;

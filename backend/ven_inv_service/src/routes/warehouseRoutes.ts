import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouseController';

const router = Router();
const controller = new WarehouseController();

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;

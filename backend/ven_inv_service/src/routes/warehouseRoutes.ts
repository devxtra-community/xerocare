import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouseController';
import { WarehouseService } from '../services/warehouseService';
import { WarehouseRepository } from '../repositories/warehouseRepository';
import { Source } from '../config/db';

const router = Router();
const repository = new WarehouseRepository(Source);
const service = new WarehouseService(repository);
const controller = new WarehouseController(service);

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;

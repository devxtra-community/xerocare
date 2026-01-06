import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { BranchRepository } from '../repositories/branchRepository';
import { BranchService } from '../services/branchService';
import { BranchController } from '../controllers/branchController';
import { Source } from '../config/db';

const router = Router();

const branchRepo = new BranchRepository(Source);
const branchService = new BranchService(branchRepo);
const branchController = new BranchController(branchService);

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), branchController.create);

router.get('/', authMiddleware, roleMiddleware(['ADMIN']), branchController.list);

router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), branchController.update);

router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), branchController.delete);

export default router;

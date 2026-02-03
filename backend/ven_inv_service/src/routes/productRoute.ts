import { Router } from 'express';
import {
  addproduct,
  bulkCreateProducts,
  deleteproduct,
  getallproducts,
  updateproduct,
} from '../controllers/productController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { uploadProductImage } from '../middlewares/uploadProductImage';
const productRoute = Router();
productRoute.post(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  uploadProductImage.single('image'),
  addproduct,
);
productRoute.get(
  '/',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER', 'EMPLOYEE', 'FINANCE']),
  getallproducts,
);
productRoute.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  uploadProductImage.single('image'),
  updateproduct,
);
productRoute.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'MANAGER']), deleteproduct);
productRoute.post(
  '/bulk',
  authMiddleware,
  roleMiddleware(['ADMIN', 'MANAGER']),
  bulkCreateProducts,
);
export default productRoute;

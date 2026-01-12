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
const productRoute = Router();

productRoute.post('/', authMiddleware, roleMiddleware, addproduct);
productRoute.get('/', authMiddleware, roleMiddleware, getallproducts);
productRoute.put('/:id', authMiddleware, roleMiddleware, updateproduct);
productRoute.delete('/:id', authMiddleware, roleMiddleware, deleteproduct);
productRoute.post('/bulk', authMiddleware, roleMiddleware, bulkCreateProducts);

export default productRoute;

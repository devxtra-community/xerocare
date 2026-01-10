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

productRoute.post('/', addproduct);
productRoute.get('/', getallproducts);
productRoute.put('/:id', updateproduct);
productRoute.delete('/:id', deleteproduct);
productRoute.post('/bulk', authMiddleware, roleMiddleware, bulkCreateProducts);

export default productRoute;

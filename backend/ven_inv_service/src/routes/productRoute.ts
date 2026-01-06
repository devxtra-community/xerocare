import { Router } from "express";
import { addproduct, deleteproduct, getallproducts, updateproduct } from "../controllers/productController";
const productRoute = Router();

productRoute.post('/',addproduct);
productRoute.get('/',getallproducts);
productRoute.put('/:id',updateproduct);
productRoute.delete('/:id',deleteproduct);

export default productRoute;
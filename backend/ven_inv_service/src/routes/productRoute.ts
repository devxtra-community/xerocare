import { Router } from "express";
import { addproduct, deleteproduct, getallproducts, updateproduct } from "../controllers/productController";
const productRoute = Router();

productRoute.post('/',addproduct);
productRoute.get('/',getallproducts);
productRoute.put('/',updateproduct);
productRoute.delete('/',deleteproduct);

export default productRoute;
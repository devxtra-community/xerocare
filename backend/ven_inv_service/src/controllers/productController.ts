import { Request, Response } from "express";
import { AppError } from "../errors/appError";
import { ProductService } from "../services/productService";

const service = new ProductService();
export const addproduct = async (req: Request, res: Response) => {
    try {   
        const productData = req.body;
        const newproduct = await service.addProduct(productData);
        res.status(200).json({ message: "Product added successfully", data: newproduct, success: true });
    }
    catch (error) {
        throw new AppError("Failed to add product", 500);
    }
};

export const getallproducts = async (req: Request, res: Response) => {
    try {
        const products = await service.getAllProducts();
        if (products.length === 0) {
            return res.status(200).json({ message: "No products found", data: products, success: true });
        }
        res.status(200).json({ message: "Fetched all products successfully", data: products, success: true });
    }
    catch (error) {
        throw new AppError("Failed to fetch products", 500);
    }
};

export const updateproduct = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const productData = req.body;
        const updated = await service.updateProduct(id, productData);
        if (!updated) {
            throw new AppError("Product not found", 404);
        }
        res.status(200).json({ message: "Product updated successfully", success: true });
    }
    catch (error) {
        throw new AppError("Failed to update product", 500);
    }
};

export const deleteproduct = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const deleted = await service.deleteProduct(id);
        if (!deleted) {
            throw new AppError("Product not found", 404);
        }
        return res.status(200).json({ message: "Product deleted successfully", success: true });
    }
    catch (error) {
        throw new AppError("Failed to delete product", 500);
    }
};

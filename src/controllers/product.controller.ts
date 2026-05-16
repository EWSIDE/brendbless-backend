import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { productService } from '../services/product.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

export class ProductController {
  // Get products (public)
  getProducts = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const query = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        category: req.query.category as string,
        search: req.query.search as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        featured: req.query.featured === 'true',
        onSale: req.query.onSale === 'true',
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
      };

      const result = await productService.getProducts(query);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  };

  // Get single product (public)
  getProduct = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const { identifier } = req.params;
      const product = await productService.getProduct(identifier);

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  };

  // Get featured products (public)
  getFeatured = async (_req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const products = await productService.getFeaturedProducts(10);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  };

  // Get products on sale (public)
  getOnSale = async (_req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const products = await productService.getOnSaleProducts(20);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  };

  // Get related products (public)
  getRelated = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const { productId } = req.params;
      const products = await productService.getRelatedProducts(productId);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  };

  // Create product (admin)
  createProduct = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
        return;
      }

      const product = await productService.createProduct(req.body);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update product (admin)
  updateProduct = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const product = await productService.updateProduct(id, req.body);

      res.json({
        success: true,
        data: product,
        message: 'Product updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete product (admin)
  deleteProduct = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await productService.deleteProduct(id);

      res.json({
        success: true,
        message: 'Product deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Reorder products (admin) - batch update sortOrder
  reorderProducts = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({
          success: false,
          error: 'items must be an array of {id, sortOrder}'
        });
        return;
      }

      await productService.reorderProducts(items);

      res.json({
        success: true,
        message: 'Products reordered successfully.'
      });
    } catch (error) {
      next(error);
    }
  };
}

export const productController = new ProductController();

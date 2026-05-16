import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/category.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

export class CategoryController {
  // Get all categories
  getCategories = async (_req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const categories = await categoryService.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  };

  // Get single category
  getCategory = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const { slug } = req.params;
      const category = await categoryService.getCategory(slug);

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  };

  // Create category (admin)
  createCategory = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const category = await categoryService.createCategory(req.body);

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Update category (admin)
  updateCategory = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const category = await categoryService.updateCategory(id, req.body);

      res.json({
        success: true,
        data: category,
        message: 'Category updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete category (admin)
  deleteCategory = async (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await categoryService.deleteCategory(id);

      res.json({
        success: true,
        message: 'Category deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  };
}

export const categoryController = new CategoryController();

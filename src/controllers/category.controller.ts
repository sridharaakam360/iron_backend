import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { CategoryService } from '../services/category.service';
import { ApiResponseUtil } from '../utils/response';

const categoryService = new CategoryService();

export class CategoryController {
  async createCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        throw new Error('Store ID is required');
      }
      const category = await categoryService.createCategory(req.body, storeId);
      ApiResponseUtil.created(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { includeInactive } = req.query;
      const storeId = req.user?.storeId;
      if (!storeId) {
        throw new Error('Store ID is required');
      }
      const categories = await categoryService.getCategories(storeId, includeInactive === 'true');
      ApiResponseUtil.success(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const category = await categoryService.getCategoryById(id);
      ApiResponseUtil.success(res, category);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const category = await categoryService.updateCategory(id, req.body);
      ApiResponseUtil.success(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await categoryService.deleteCategory(id);
      ApiResponseUtil.success(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

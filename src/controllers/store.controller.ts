import { Request, Response, NextFunction } from 'express';
import { storeService } from '../services/store.service';
import { ApiResponseUtil } from '../utils/response';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class StoreController {
  async registerStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('🟢 [CONTROLLER] Registration request received:', {
        storeName: req.body.storeName,
        storeEmail: req.body.storeEmail,
      });

      const result = await storeService.createStore(req.body);

      console.log('🟢 [CONTROLLER] Registration successful, sending response');
      ApiResponseUtil.created(res, result, 'Store registered successfully. Please wait for approval.');
    } catch (error) {
      console.log('🔴 [CONTROLLER] Registration error:', error);
      next(error);
    }
  }

  async getAllStores(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isApproved, search } = req.query;

      const filters: any = {};
      if (isApproved !== undefined) {
        filters.isApproved = isApproved === 'true';
      }
      if (search) {
        filters.search = search as string;
      }

      const stores = await storeService.getStores(filters);
      ApiResponseUtil.success(res, stores);
    } catch (error) {
      next(error);
    }
  }

  async getStoreById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = await storeService.getStoreById(req.params.id);
      ApiResponseUtil.success(res, store);
    } catch (error) {
      next(error);
    }
  }

  async approveStore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await storeService.approveStore(req.params.id);
      ApiResponseUtil.success(res, result, 'Store approved successfully');
    } catch (error) {
      next(error);
    }
  }

  async rejectStore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await storeService.rejectStore(req.params.id);
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  async updateStore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = await storeService.updateStore(req.params.id, req.body);
      ApiResponseUtil.success(res, store, 'Store updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleStoreStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const store = await storeService.toggleStoreStatus(req.params.id, reason);
      ApiResponseUtil.success(res, store, 'Store status updated');
    } catch (error) {
      next(error);
    }
  }

  async getStoreSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.user?.storeId || (req.params.id !== 'my-store' ? req.params.id : null);
      if (!storeId) {
        throw new AppError('Store ID required', 400);
      }

      const store = await storeService.getStoreById(storeId);
      const settings = await storeService.getStoreSettings(storeId);

      // Combine store info and settings as expected by frontend
      const result = {
        ...settings,
        isActive: store.isActive,
        deactivationReason: store.deactivationReason,
        subscription: store.subscriptions && store.subscriptions.find(s => s.status === 'ACTIVE')
      };

      ApiResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateStoreSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.user?.storeId!;
      const result = await storeService.updateStoreSettings(storeId, req.body);
      ApiResponseUtil.success(res, result, 'Store settings updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const storeController = new StoreController();

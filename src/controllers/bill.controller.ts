import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { BillService } from '../services/bill.service';
import { ApiResponseUtil } from '../utils/response';

const billService = new BillService();

export class BillController {
  async createBill(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
        throw new Error('Store ID is required');
      }
      const bill = await billService.createBill(req.body, storeId);
      ApiResponseUtil.created(res, bill, 'Bill created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getBills(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, search, startDate, endDate, page, limit } = req.query;

      // SUPER_ADMIN sees all bills, ADMIN/EMPLOYEE see only their store's bills
      const storeId = req.user?.role === 'SUPER_ADMIN' ? undefined : req.user?.storeId;

      const filters = {
        status: status as string,
        search: search as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        storeId,
      };

      const result = await billService.getBills(filters);

      ApiResponseUtil.paginated(
        res,
        result.bills,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Bills retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getBillById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bill = await billService.getBillById(id);
      ApiResponseUtil.success(res, bill);
    } catch (error) {
      next(error);
    }
  }

  async updateBill(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bill = await billService.updateBill(id, req.body);
      ApiResponseUtil.success(res, bill, 'Bill updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteBill(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await billService.deleteBill(id);
      ApiResponseUtil.success(res, null, 'Bill deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // SUPER_ADMIN sees stats for all stores, ADMIN/EMPLOYEE see only their store's stats
      const storeId = req.user?.role === 'SUPER_ADMIN' ? undefined : req.user?.storeId;
      const stats = await billService.getDashboardStats(storeId);
      ApiResponseUtil.success(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

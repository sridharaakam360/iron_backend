import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { CustomerService } from '../services/customer.service';
import { ApiResponseUtil } from '../utils/response';

const customerService = new CustomerService();

export class CustomerController {
  async createCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customerService.createCustomer(req.body, req.user!.storeId!);
      ApiResponseUtil.created(res, customer, 'Customer created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, page, limit } = req.query;

      const result = await customerService.getCustomers(
        req.user!.storeId!,
        search as string,
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );

      ApiResponseUtil.paginated(
        res,
        result.customers,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Customers retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getCustomerById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await customerService.getCustomerById(id);
      ApiResponseUtil.success(res, customer);
    } catch (error) {
      next(error);
    }
  }

  async updateCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await customerService.updateCustomer(id, req.body);
      ApiResponseUtil.success(res, customer, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await customerService.deleteCustomer(id);
      ApiResponseUtil.success(res, null, 'Customer deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

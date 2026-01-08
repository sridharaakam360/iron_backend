import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ApiResponseUtil } from '../utils/response';
import { ServiceTypeService } from '../services/serviceType.service';

const serviceTypeService = new ServiceTypeService();

export class ServiceTypeController {
    public async createServiceType(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) {
                throw new Error('Store ID is required');
            }

            const serviceType = await serviceTypeService.createServiceType(req.body, storeId);
            ApiResponseUtil.created(res, serviceType, 'Service type created successfully');
        } catch (error) {
            next(error);
        }
    }

    public async getServiceTypes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { includeInactive } = req.query;
            const storeId = req.user?.storeId;
            if (!storeId) {
                throw new Error('Store ID is required');
            }

            const serviceTypes = await serviceTypeService.getServiceTypes(storeId, includeInactive === 'true');
            ApiResponseUtil.success(res, serviceTypes, 'Service types retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    public async getServiceTypeById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;
            if (!storeId) {
                throw new Error('Store ID is required');
            }
            const serviceType = await serviceTypeService.getServiceTypeById(id, storeId);
            ApiResponseUtil.success(res, serviceType);
        } catch (error) {
            next(error);
        }
    }

    public async updateServiceType(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;
            if (!storeId) {
                throw new Error('Store ID is required');
            }
            const serviceType = await serviceTypeService.updateServiceType(id, storeId, req.body);
            ApiResponseUtil.success(res, serviceType, 'Service type updated successfully');
        } catch (error) {
            next(error);
        }
    }

    public async deleteServiceType(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;
            if (!storeId) {
                throw new Error('Store ID is required');
            }
            await serviceTypeService.deleteServiceType(id, storeId);
            ApiResponseUtil.success(res, null, 'Service type deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

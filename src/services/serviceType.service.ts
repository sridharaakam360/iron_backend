import { ServiceType } from '../models/ServiceType';
import { Category } from '../models/Category';

export class ServiceTypeService {
    async createServiceType(data: any, storeId: string): Promise<ServiceType> {
        return await ServiceType.create({
            ...data,
            storeId,
        });
    }

    async getServiceTypes(storeId: string, includeInactive: boolean = false): Promise<ServiceType[]> {
        const where: any = { storeId };
        if (!includeInactive) {
            where.isActive = true;
        }
        return await ServiceType.findAll({
            where,
            include: [{ model: Category, as: 'categories' }],
            order: [['name', 'ASC']],
        });
    }

    async getServiceTypeById(id: string, storeId: string): Promise<ServiceType> {
        const serviceType = await ServiceType.findOne({
            where: { id, storeId },
            include: [{ model: Category, as: 'categories' }],
        });
        if (!serviceType) {
            throw new Error('Service type not found');
        }
        return serviceType;
    }

    async updateServiceType(id: string, storeId: string, data: any): Promise<ServiceType> {
        const serviceType = await this.getServiceTypeById(id, storeId);
        return await serviceType.update(data);
    }

    async deleteServiceType(id: string, storeId: string): Promise<void> {
        const serviceType = await this.getServiceTypeById(id, storeId);

        // Check for associated categories
        const categoryCount = await Category.count({
            where: { serviceTypeId: id },
        });

        if (categoryCount > 0) {
            throw new Error('Cannot delete service type with associated categories');
        }

        await serviceType.destroy();
    }
}

import { Category } from '../models/Category';
import { BillItem } from '../models/BillItem';
import { AppError } from '../middleware/errorHandler';
import { CategoryCreateInput, CategoryUpdateInput } from '../types';
import { Op } from 'sequelize';

export class CategoryService {
  async createCategory(input: CategoryCreateInput, storeId: string) {
    const existingCategory = await Category.findOne({
      where: {
        storeId,
        name: input.name,
        serviceTypeId: input.serviceTypeId || null,
      },
    });

    if (existingCategory) {
      throw new AppError('Category with this name already exists in this service', 400);
    }

    const category = await Category.create({
      storeId,
      name: input.name,
      price: input.price,
      icon: input.icon,
      serviceTypeId: input.serviceTypeId,
    } as any);

    return category;
  }

  async getCategories(storeId: string, onlyActive = false) {
    const where: any = { storeId };
    if (onlyActive) {
      where.isActive = true;
    }

    const categories = await Category.findAll({
      where,
      order: [['name', 'ASC']],
    });

    return categories;
  }

  async getCategoryById(id: string) {
    const category = await Category.findByPk(id, {
      include: [
        {
          model: BillItem,
          limit: 10,
          order: [['createdAt', 'DESC']],
        }
      ]
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return category;
  }

  async updateCategory(id: string, input: CategoryUpdateInput) {
    const category = await Category.findByPk(id);

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (input.name && (input.name !== category.name || input.serviceTypeId !== category.serviceTypeId)) {
      const existingCategory = await Category.findOne({
        where: {
          storeId: category.storeId,
          name: input.name,
          serviceTypeId: input.serviceTypeId !== undefined ? input.serviceTypeId : category.serviceTypeId,
          id: { [Op.ne]: id }
        }
      });

      if (existingCategory) {
        throw new AppError('Category name already in use in this service', 400);
      }
    }

    await category.update(input);
    return category;
  }

  async deleteCategory(id: string) {
    const category = await Category.findByPk(id);

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Check if category is used in any bills
    const count = await BillItem.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new AppError('Cannot delete category because it is used in bills', 400);
    }

    await category.destroy();
    return { message: 'Category deleted successfully' };
  }
}

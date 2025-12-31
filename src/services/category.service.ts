import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CategoryCreateInput, CategoryUpdateInput } from '../types';
import { Prisma } from '../generated/prisma';

export class CategoryService {
  async createCategory(input: CategoryCreateInput, storeId: string) {
    const existingCategory = await prisma.category.findUnique({
      where: {
        storeId_name: {
          storeId,
          name: input.name,
        },
      },
    });

    if (existingCategory) {
      throw new AppError('Category with this name already exists in your store', 400);
    }

    const category = await prisma.category.create({
      data: {
        storeId,
        name: input.name,
        price: new Prisma.Decimal(input.price),
        icon: input.icon,
      },
    });

    return category;
  }

  async getCategories(storeId: string, includeInactive = false) {
    const where: any = { storeId };

    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { billItems: true },
        },
      },
    });

    return categories;
  }

  async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        billItems: {
          include: {
            bill: {
              include: {
                customer: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { billItems: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return category;
  }

  async updateCategory(id: string, input: CategoryUpdateInput) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (input.name && input.name !== category.name) {
      const existingCategory = await prisma.category.findUnique({
        where: {
          storeId_name: {
            storeId: category.storeId,
            name: input.name,
          },
        },
      });

      if (existingCategory) {
        throw new AppError('Category name already in use in your store', 400);
      }
    }

    const updateData: any = {};

    if (input.name) updateData.name = input.name;
    if (input.price !== undefined) updateData.price = new Prisma.Decimal(input.price);
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return updatedCategory;
  }

  async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { billItems: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (category._count.billItems > 0) {
      throw new AppError(
        'Cannot delete category that has been used in bills. Consider deactivating it instead.',
        400
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }
}

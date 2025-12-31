import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { BillCreateInput, BillUpdateInput, DashboardStats } from '../types';
import { Prisma } from '../generated/prisma';

export class BillService {
  async generateBillNumber(storeId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `BILL-${year}${month}${day}`;

    const lastBill = await prisma.bill.findFirst({
      where: {
        storeId,
        billNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!lastBill) {
      return `${prefix}-001`;
    }

    const lastNumber = parseInt(lastBill.billNumber.split('-').pop() || '0');
    const nextNumber = String(lastNumber + 1).padStart(3, '0');
    return `${prefix}-${nextNumber}`;
  }

  async createBill(input: BillCreateInput, storeId: string) {
    let customer = await prisma.customer.findUnique({
      where: {
        storeId_phone: {
          storeId,
          phone: input.customerPhone,
        }
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          storeId,
          name: input.customerName,
          phone: input.customerPhone,
          email: input.customerEmail,
          address: input.customerAddress,
        },
      });
    }

    const billNumber = await this.generateBillNumber(storeId);

    let totalAmount = new Prisma.Decimal(0);
    const billItemsData = [];

    for (const item of input.items) {
      if (item.quantity <= 0) continue;

      const category = await prisma.category.findUnique({
        where: { id: item.categoryId },
      });

      if (!category || !category.isActive) {
        throw new AppError(`Category not found or inactive`, 400);
      }

      // Verify category belongs to the same store
      if (category.storeId !== storeId) {
        throw new AppError(`Category does not belong to your store`, 403);
      }

      const subtotal = category.price.mul(item.quantity);
      totalAmount = totalAmount.add(subtotal);

      billItemsData.push({
        categoryId: item.categoryId,
        quantity: item.quantity,
        price: category.price,
        subtotal,
      });
    }

    if (billItemsData.length === 0) {
      throw new AppError('At least one item is required', 400);
    }

    const bill = await prisma.bill.create({
      data: {
        storeId,
        billNumber,
        customerId: customer.id,
        totalAmount,
        status: 'PENDING',
        notes: input.notes,
        items: {
          create: billItemsData,
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            category: true,
          },
        },
      },
    });

    return bill;
  }

  async getBills(filters?: {
    status?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    storeId?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by store ID for store admins and employees
    if (filters?.storeId) {
      where.storeId = filters.storeId;
    }

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status.toUpperCase();
    }

    if (filters?.search) {
      where.OR = [
        { billNumber: { contains: filters.search } },
        { customer: { name: { contains: filters.search } } },
        { customer: { phone: { contains: filters.search } } },
      ];
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where }),
    ]);

    return {
      bills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBillById(id: string) {
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            category: true,
          },
        },
        notifications: true,
      },
    });

    if (!bill) {
      throw new AppError('Bill not found', 404);
    }

    return bill;
  }

  async updateBill(id: string, input: BillUpdateInput) {
    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      throw new AppError('Bill not found', 404);
    }

    const updateData: any = {};

    if (input.status) {
      updateData.status = input.status;
      if (input.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    const updatedBill = await prisma.bill.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: {
          include: {
            category: true,
          },
        },
      },
    });

    return updatedBill;
  }

  async deleteBill(id: string) {
    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      throw new AppError('Bill not found', 404);
    }

    await prisma.bill.delete({
      where: { id },
    });

    return { message: 'Bill deleted successfully' };
  }

  async getDashboardStats(storeId?: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Base where clause for store filtering
    const baseWhere: any = storeId ? { storeId } : {};

    const [totalBills, pendingBills, completedBills, todayBills, weeklyBills, monthlyBills, recentBills] =
      await Promise.all([
        prisma.bill.count({ where: baseWhere }),
        prisma.bill.count({ where: { ...baseWhere, status: 'PENDING' } }),
        prisma.bill.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
        prisma.bill.findMany({
          where: {
            ...baseWhere,
            createdAt: { gte: today },
          },
        }),
        prisma.bill.findMany({
          where: {
            ...baseWhere,
            createdAt: { gte: weekAgo },
            status: 'COMPLETED',
          },
        }),
        prisma.bill.findMany({
          where: {
            ...baseWhere,
            createdAt: { gte: monthAgo },
            status: 'COMPLETED',
          },
        }),
        prisma.bill.findMany({
          where: baseWhere,
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: true,
            items: {
              include: {
                category: true,
              },
            },
          },
        }),
      ]);

    const todayRevenue = todayBills.reduce(
      (sum, bill) => sum + parseFloat(bill.totalAmount.toString()),
      0
    );

    const weeklyRevenue = weeklyBills.reduce(
      (sum, bill) => sum + parseFloat(bill.totalAmount.toString()),
      0
    );

    const monthlyRevenue = monthlyBills.reduce(
      (sum, bill) => sum + parseFloat(bill.totalAmount.toString()),
      0
    );

    return {
      totalBills,
      pendingBills,
      completedBills,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      recentBills,
    };
  }
}

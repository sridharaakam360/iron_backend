import { Bill, BillStatus } from '../models/Bill';
import { BillItem } from '../models/BillItem';
import { Category } from '../models/Category';
import { Customer } from '../models/Customer';
import { AppError } from '../middleware/errorHandler';
import { BillCreateInput, BillUpdateInput, DashboardStats } from '../types';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { NotificationService } from './notification.service';

const notificationService = new NotificationService();

export class BillService {
  async generateBillNumber(storeId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `BILL-${year}${month}${day}`;

    const lastBill = await Bill.findOne({
      where: {
        storeId,
        billNumber: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!lastBill) {
      return `${prefix}-001`;
    }

    const lastNumber = parseInt(lastBill.billNumber.split('-').pop() || '0');
    const nextNumber = String(lastNumber + 1).padStart(3, '0');
    return `${prefix}-${nextNumber}`;
  }

  async createBill(input: BillCreateInput, storeId: string) {
    const transaction = await sequelize.transaction();

    try {
      let customer = await Customer.findOne({
        where: { storeId, phone: input.customerPhone },
        transaction,
      });

      if (!customer) {
        customer = await Customer.create({
          storeId,
          name: input.customerName,
          phone: input.customerPhone,
          email: input.customerEmail,
          address: input.customerAddress,
        } as any, { transaction });
      }

      const billNumber = await this.generateBillNumber(storeId);

      let totalAmount = 0;
      const billItemsData: any[] = [];

      for (const item of input.items) {
        if (item.quantity <= 0) continue;

        const category = await Category.findByPk(item.categoryId, { transaction });

        if (!category || !category.isActive) {
          throw new AppError(`Category not found or inactive`, 400);
        }

        if (category.storeId !== storeId) {
          throw new AppError(`Category does not belong to your store`, 403);
        }

        const subtotal = Number(category.price) * item.quantity;
        totalAmount += subtotal;

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

      const bill = await Bill.create({
        storeId,
        billNumber,
        customerId: customer.id,
        totalAmount,
        status: input.status || BillStatus.PENDING,
        paymentStatus: input.paymentStatus || 'PENDING',
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      }, { transaction });

      await BillItem.bulkCreate(
        billItemsData.map(item => ({ ...item, billId: bill.id })),
        { transaction }
      );

      await transaction.commit();

      // Trigger notification if paid
      if (input.paymentStatus === 'PAID') {
        notificationService.sendPaymentConfirmation(bill.id).catch(err =>
          console.error(`Failed to send payment confirmation for bill ${bill.id}:`, err)
        );
      }

      const createdBill = await Bill.findByPk(bill.id, {
        include: [
          { model: Customer },
          { model: BillItem, include: [Category] }
        ]
      });

      return createdBill;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
    const offset = (page - 1) * limit;

    const where: any = {};

    if (filters?.storeId) {
      where.storeId = filters.storeId;
    }

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status.toUpperCase();
    }

    if (filters?.search) {
      where[Op.or] = [
        { billNumber: { [Op.like]: `%${filters.search}%` } },
        { '$customer.name$': { [Op.like]: `%${filters.search}%` } },
        { '$customer.phone$': { [Op.like]: `%${filters.search}%` } },
      ];
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt[Op.gte] = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt[Op.lte] = filters.endDate;
      }
    }

    const { rows: bills, count: total } = await Bill.findAndCountAll({
      where,
      include: [
        { model: Customer },
        { model: BillItem, include: [Category] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true, // Important when using includes with findAndCountAll
    });

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
    const bill = await Bill.findByPk(id, {
      include: [
        { model: Customer },
        { model: BillItem, include: [Category] },
        { association: 'notifications' }
      ],
    });

    if (!bill) {
      throw new AppError('Bill not found', 404);
    }

    return bill;
  }

  async updateBill(id: string, input: BillUpdateInput) {
    const bill = await Bill.findByPk(id);

    if (!bill) {
      throw new AppError('Bill not found', 404);
    }

    const updateData: any = {};

    if (input.status) {
      updateData.status = input.status;
      if (input.status === 'COMPLETED' || input.status === 'READY') {
        if (input.status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }

        // Trigger collection reminder
        notificationService.sendCollectionReminder(bill.id).catch(err =>
          console.error(`Failed to send collection reminder for bill ${bill.id}:`, err)
        );
      }
    }

    if (input.paymentStatus) {
      const oldPaymentStatus = bill.paymentStatus;
      updateData.paymentStatus = input.paymentStatus;

      // Trigger confirmation if updated to PAID
      if (input.paymentStatus === 'PAID' && oldPaymentStatus !== 'PAID') {
        notificationService.sendPaymentConfirmation(bill.id).catch(err =>
          console.error(`Failed to send payment confirmation for bill ${bill.id}:`, err)
        );
      }
    }

    if (input.paymentMethod) {
      updateData.paymentMethod = input.paymentMethod;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    await bill.update(updateData);

    return await this.getBillById(id);
  }

  async deleteBill(id: string) {
    const bill = await Bill.findByPk(id);

    if (!bill) {
      throw new AppError('Bill not found', 404);
    }

    await bill.destroy();

    return { message: 'Bill deleted successfully' };
  }

  async getDashboardStats(storeId?: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const baseWhere: any = storeId ? { storeId } : {};

    const totalBills = await Bill.count({ where: baseWhere });
    const pendingBills = await Bill.count({ where: { ...baseWhere, status: BillStatus.PENDING } });
    const completedBills = await Bill.count({ where: { ...baseWhere, status: BillStatus.COMPLETED } });

    const todayBills = await Bill.findAll({
      where: {
        ...baseWhere,
        createdAt: { [Op.gte]: today },
      },
    });

    const weeklyBills = await Bill.findAll({
      where: {
        ...baseWhere,
        createdAt: { [Op.gte]: weekAgo },
        status: BillStatus.COMPLETED,
      },
    });

    const monthlyBills = await Bill.findAll({
      where: {
        ...baseWhere,
        createdAt: { [Op.gte]: monthAgo },
        status: BillStatus.COMPLETED,
      },
    });

    const recentBills = await Bill.findAll({
      where: baseWhere,
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Customer },
        { model: BillItem, include: [Category] }
      ],
    });

    const todayRevenue = todayBills.reduce(
      (sum, bill) => sum + Number(bill.totalAmount),
      0
    );

    const weeklyRevenue = weeklyBills.reduce(
      (sum, bill) => sum + Number(bill.totalAmount),
      0
    );

    const monthlyRevenue = monthlyBills.reduce(
      (sum, bill) => sum + Number(bill.totalAmount),
      0
    );

    return {
      totalBills,
      pendingBills,
      completedBills,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      recentBills: recentBills as any,
    };
  }
}

import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CustomerCreateInput } from '../types';

export class CustomerService {
  async createCustomer(input: CustomerCreateInput) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: input.phone },
    });

    if (existingCustomer) {
      throw new AppError('Customer with this phone number already exists', 400);
    }

    const customer = await prisma.customer.create({
      data: input,
    });

    return customer;
  }

  async getCustomers(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          bills: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          _count: {
            select: { bills: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        bills: {
          include: {
            items: {
              include: {
                category: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { bills: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    return customer;
  }

  async updateCustomer(id: string, input: Partial<CustomerCreateInput>) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    if (input.phone && input.phone !== customer.phone) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { phone: input.phone },
      });

      if (existingCustomer) {
        throw new AppError('Phone number already in use', 400);
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: input,
    });

    return updatedCustomer;
  }

  async deleteCustomer(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bills: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    if (customer._count.bills > 0) {
      throw new AppError('Cannot delete customer with existing bills', 400);
    }

    await prisma.customer.delete({
      where: { id },
    });

    return { message: 'Customer deleted successfully' };
  }
}

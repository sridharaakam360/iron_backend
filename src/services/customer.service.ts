import { Customer } from '../models/Customer';
import { Bill } from '../models/Bill';
import { AppError } from '../middleware/errorHandler';
import { CustomerCreateInput, CustomerUpdateInput } from '../types';
import { Op } from 'sequelize';

export class CustomerService {
  async createCustomer(input: CustomerCreateInput, storeId: string) {
    const existingCustomer = await Customer.findOne({
      where: {
        storeId,
        phone: input.phone,
      },
    });

    if (existingCustomer) {
      throw new AppError('Customer with this phone number already exists', 400);
    }

    const customer = await Customer.create({
      storeId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address,
    } as any);

    return customer;
  }

  async getCustomers(storeId: string, search?: string) {
    const where: any = { storeId };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const customers = await Customer.findAll({
      where,
      order: [['name', 'ASC']],
    });

    return customers;
  }

  async getCustomerById(id: string) {
    const customer = await Customer.findByPk(id, {
      include: [
        {
          model: Bill,
          limit: 10,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    return customer;
  }

  async getCustomerByPhone(phone: string, storeId: string) {
    const customer = await Customer.findOne({
      where: {
        storeId,
        phone,
      },
    });

    return customer;
  }

  async updateCustomer(id: string, input: CustomerUpdateInput) {
    const customer = await Customer.findByPk(id);

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    if (input.phone && input.phone !== customer.phone) {
      const existingCustomer = await Customer.findOne({
        where: {
          storeId: customer.storeId,
          phone: input.phone,
          id: { [Op.ne]: id },
        },
      });

      if (existingCustomer) {
        throw new AppError('Phone number already in use', 400);
      }
    }

    await customer.update(input);
    return customer;
  }

  async deleteCustomer(id: string) {
    const customer = await Customer.findByPk(id);

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Check if customer has any bills
    const billCount = await Bill.count({ where: { customerId: id } });
    if (billCount > 0) {
      throw new AppError('Cannot delete customer with existing bills', 400);
    }

    await customer.destroy();
    return { message: 'Customer deleted successfully' };
  }
}

import { Store } from '../models/Store';
import { User, UserRole } from '../models/User';
import { StoreSetting } from '../models/StoreSetting';
import { Subscription, SubscriptionPlan, SubscriptionStatus, BillingCycle } from '../models/Subscription';
import { AppError } from '../middleware/errorHandler';
import { PasswordUtil } from '../utils/password';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

export class StoreService {
  async createStore(input: any) {
    const transaction = await sequelize.transaction();

    try {
      const existingStore = await Store.findOne({
        where: { email: input.storeEmail },
        transaction,
      });

      if (existingStore) {
        throw new AppError('Store with this email already exists', 400);
      }

      const existingUser = await User.findOne({
        where: { email: input.adminEmail },
        transaction,
      });

      if (existingUser) {
        throw new AppError('Admin user with this email already exists', 400);
      }

      const store = await Store.create({
        name: input.storeName,
        email: input.storeEmail,
        phone: input.storePhone,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        gstNumber: input.gstNumber,
      }, { transaction });

      const hashedPassword = await PasswordUtil.hash(input.password);
      await User.create({
        storeId: store.id,
        name: input.adminName,
        email: input.adminEmail,
        password: hashedPassword,
        role: UserRole.ADMIN,
      }, { transaction });

      // Create default settings
      const defaultSettings = [
        { key: 'currency', value: 'INR' },
        { key: 'tax_rate', value: '0' },
        { key: 'bill_prefix', value: 'BILL' },
        { key: 'sms_notifications', value: 'false' },
        { key: 'whatsapp_notifications', value: 'false' },
      ];

      await StoreSetting.bulkCreate(
        defaultSettings.map(s => ({ ...s, storeId: store.id })),
        { transaction }
      );

      // Create initial free subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 year free

      await Subscription.create({
        storeId: store.id,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
        renewalDate: endDate,
        amount: 0,
        billingCycle: BillingCycle.YEARLY,
      }, { transaction });

      await transaction.commit();
      return store;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getStores(filters?: any) {
    const where: any = {};

    if (filters?.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    if (filters?.isApproved !== undefined) {
      where.isApproved = filters.isApproved;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await Store.findAll({
      where,
      include: [
        {
          model: Subscription,
          where: { status: SubscriptionStatus.ACTIVE },
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getStoreById(id: string) {
    const store = await Store.findByPk(id, {
      include: [User, StoreSetting, Subscription],
    });

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    return store;
  }

  async updateStore(id: string, input: any) {
    const store = await Store.findByPk(id);

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    await store.update(input);
    return store;
  }

  async approveStore(id: string) {
    const store = await Store.findByPk(id);

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    await store.update({ isApproved: true });
    return store;
  }

  async rejectStore(id: string) {
    const store = await Store.findByPk(id);

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Assuming reject means deleting the store or marking as unapproved
    // This logic depends on requirements. For now, let's delete it or disable it.
    // If it's a new registration, rejection usually means deletion.
    await store.destroy();
    return { message: 'Store rejected' };
  }

  async toggleStoreStatus(id: string, isActive: boolean, reason?: string) {
    const store = await Store.findByPk(id);

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    await store.update({
      isActive,
      deactivationReason: isActive ? null : reason,
      deactivatedAt: isActive ? null : new Date(),
    });

    return store;
  }

  async getStoreSettings(storeId: string) {
    return await StoreSetting.findAll({
      where: { storeId },
    });
  }

  async updateStoreSettings(storeId: string, settings: { key: string; value: string }[]) {
    const transaction = await sequelize.transaction();

    try {
      for (const setting of settings) {
        await StoreSetting.upsert({
          storeId,
          key: setting.key,
          value: setting.value,
        }, { transaction });
      }

      await transaction.commit();
      return await this.getStoreSettings(storeId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getStoreStats(storeId: string) {
    // This would typically involve complex queries, using raw queries for simplicity or multiple counts
    const userCount = await User.count({ where: { storeId } });
    const activeSubscription = await Subscription.findOne({
      where: { storeId, status: SubscriptionStatus.ACTIVE },
    });

    return {
      userCount,
      activeSubscription,
    };
  }
}

export const storeService = new StoreService();

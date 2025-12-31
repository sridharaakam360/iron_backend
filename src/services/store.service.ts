import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { PasswordUtil } from '../utils/password';

interface StoreRegistrationInput {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  adminName: string;
  adminEmail: string;
  password: string;
}

export class StoreService {
  async registerStore(input: StoreRegistrationInput) {
    console.log('🔵 [REGISTRATION START]', { storeName: input.storeName, storeEmail: input.storeEmail });

    // Check both emails and hash password in parallel for faster registration
    console.log('🔵 [STEP 1] Checking existing emails and hashing password...');
    const startTime = Date.now();

    const [existingStore, existingUser, hashedPassword] = await Promise.all([
      prisma.store.findUnique({ where: { email: input.storeEmail } }),
      prisma.user.findUnique({ where: { email: input.adminEmail } }),
      PasswordUtil.hash(input.password),
    ]);

    console.log(`✅ [STEP 1 DONE] Time: ${Date.now() - startTime}ms`);

    if (existingStore) {
      console.log('❌ Store email already exists');
      throw new AppError('Store with this email already exists', 400);
    }

    if (existingUser) {
      console.log('❌ Admin email already exists');
      throw new AppError('User with this email already exists', 400);
    }

    // Simplified registration - only create store and admin (fast!)
    console.log('🔵 [STEP 2] Creating store and admin in transaction...');
    const txStartTime = Date.now();

    const result = await prisma.$transaction(async (tx) => {
      console.log('🔵 [STEP 2a] Creating store...');
      const store = await tx.store.create({
        data: {
          name: input.storeName,
          email: input.storeEmail,
          phone: input.storePhone,
          address: input.address,
          city: input.city,
          state: input.state,
          pincode: input.pincode,
          gstNumber: input.gstNumber,
          isApproved: false, // Requires SuperAdmin approval
          isActive: true,
        },
      });
      console.log('✅ [STEP 2a DONE] Store created:', store.id);

      console.log('🔵 [STEP 2b] Creating admin user...');
      const admin = await tx.user.create({
        data: {
          email: input.adminEmail,
          password: hashedPassword,
          name: input.adminName,
          role: 'ADMIN',
          storeId: store.id,
          isActive: false, // Inactive until store is approved
        },
      });
      console.log('✅ [STEP 2b DONE] Admin created:', admin.id);

      return { store, admin };
    });

    console.log(`✅ [STEP 2 DONE] Transaction time: ${Date.now() - txStartTime}ms`);

    const response = {
      message: 'Store registration successful. Awaiting SuperAdmin approval.',
      store: {
        id: result.store.id,
        name: result.store.name,
        email: result.store.email,
        isApproved: result.store.isApproved,
      },
    };

    console.log(`✅ [REGISTRATION COMPLETE] Total time: ${Date.now() - startTime}ms`);
    return response;
  }

  async getAllStores(filters?: { isApproved?: boolean; search?: string }) {
    const where: any = {};

    if (filters?.isApproved !== undefined) {
      where.isApproved = filters.isApproved;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } },
      ];
    }

    const stores = await prisma.store.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            bills: true,
            customers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return stores;
  }

  async getStoreById(id: string) {
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            bills: true,
            customers: true,
            categories: true,
          },
        },
      },
    });

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    return store;
  }

  async approveStore(storeId: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    if (store.isApproved) {
      throw new AppError('Store is already approved', 400);
    }

    // Approve store, activate users, and create default settings & categories
    await prisma.$transaction(async (tx) => {
      // Approve store
      await tx.store.update({
        where: { id: storeId },
        data: { isApproved: true },
      });

      // Activate all users
      await tx.user.updateMany({
        where: { storeId },
        data: { isActive: true },
      });

      // Create default settings and categories in parallel
      await Promise.all([
        tx.storeSetting.createMany({
          data: [
            {
              storeId,
              key: 'notifications_email_enabled',
              value: 'true',
            },
            {
              storeId,
              key: 'notifications_whatsapp_enabled',
              value: 'false',
            },
            {
              storeId,
              key: 'notifications_sms_enabled',
              value: 'false',
            },
          ],
        }),
        tx.category.createMany({
          data: [
            { storeId, name: 'Shirt', price: 15, icon: '👔' },
            { storeId, name: 'Pants', price: 20, icon: '👖' },
            { storeId, name: 'Lowers', price: 12, icon: '🩳' },
            { storeId, name: 'Saree', price: 50, icon: '🥻' },
            { storeId, name: 'Suit', price: 80, icon: '🤵' },
            { storeId, name: 'Kurta', price: 25, icon: '👘' },
            { storeId, name: 'Dress', price: 35, icon: '👗' },
            { storeId, name: 'Blazer', price: 45, icon: '🧥' },
            { storeId, name: 'T-Shirt', price: 10, icon: '👕' },
            { storeId, name: 'Bedsheet', price: 30, icon: '🛏️' },
          ],
        }),
      ]);
    });

    return { message: 'Store approved successfully' };
  }

  async rejectStore(storeId: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Delete store (cascades to users, categories, etc.)
    await prisma.store.delete({
      where: { id: storeId },
    });

    return { message: 'Store rejected and deleted' };
  }

  async updateStore(storeId: string, data: Partial<StoreRegistrationInput>) {
    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        name: data.storeName,
        phone: data.storePhone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        gstNumber: data.gstNumber,
      },
    });

    return store;
  }

  async toggleStoreStatus(storeId: string, reason?: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    const newStatus = !store.isActive;
    const updateData: any = { isActive: newStatus };

    // If deactivating, save reason and timestamp
    if (!newStatus && reason) {
      updateData.deactivationReason = reason;
      updateData.deactivatedAt = new Date();
    }

    // If activating, clear reason and timestamp
    if (newStatus) {
      updateData.deactivationReason = null;
      updateData.deactivatedAt = null;
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: updateData,
    });

    return updatedStore;
  }

  async getStoreSettings(storeId: string) {
    const [settings, store, subscription] = await Promise.all([
      prisma.storeSetting.findMany({
        where: { storeId },
      }),
      prisma.store.findUnique({
        where: { id: storeId },
        select: { isActive: true, deactivationReason: true },
      }),
      prisma.subscription.findFirst({
        where: { storeId, status: 'ACTIVE' },
        orderBy: { endDate: 'desc' },
      }),
    ]);

    // Key mapping from DB to Frontend
    const dbToFrontendMap: Record<string, string> = {
      'notifications_email_enabled': 'emailNotificationsEnabled',
      'notifications_sms_enabled': 'smsNotificationsEnabled',
      'notifications_whatsapp_enabled': 'whatsappNotificationsEnabled',
    };

    // Convert to key-value object with mapping
    const settingsObj: Record<string, any> = {
      isActive: store?.isActive ?? true,
      deactivationReason: store?.deactivationReason ?? null,
      subscription: subscription ? {
        plan: subscription.plan,
        endDate: subscription.endDate,
        status: subscription.status,
      } : null,
    };

    settings.forEach((setting) => {
      const frontendKey = dbToFrontendMap[setting.key] || setting.key;
      settingsObj[frontendKey] = setting.value === 'true' ? true : 
                                 setting.value === 'false' ? false : 
                                 setting.value;
    });

    return settingsObj;
  }

  async updateStoreSettings(storeId: string, settings: Record<string, any>) {
    // Key mapping from Frontend to DB
    const frontendToDbMap: Record<string, string> = {
      'emailNotificationsEnabled': 'notifications_email_enabled',
      'smsNotificationsEnabled': 'notifications_sms_enabled',
      'whatsappNotificationsEnabled': 'notifications_whatsapp_enabled',
    };

    const updates: any[] = [];

    for (const [key, value] of Object.entries(settings)) {
      const dbKey = frontendToDbMap[key];
      if (dbKey) {
        updates.push(
          prisma.storeSetting.upsert({
            where: {
              storeId_key: { storeId, key: dbKey },
            },
            update: { value: String(value) },
            create: { storeId, key: dbKey, value: String(value) },
          })
        );
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return { message: 'Settings updated successfully' };
  }
}

export const storeService = new StoreService();

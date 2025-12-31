import { Request, Response } from 'express';
import { Store } from '../models/Store';
import { User, UserRole } from '../models/User';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';

export const registerStore = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    console.log('📝 Registration started');
    const {
      storeName,
      storeEmail,
      storePhone,
      address,
      city,
      state,
      pincode,
      gstNumber,
      adminName,
      adminEmail,
      password,
    } = req.body;

    // Simple validation
    if (!storeName || !storeEmail || !storePhone || !adminName || !adminEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed');

    console.log('💾 Creating store and admin...');
    const store = await Store.create({
      name: storeName,
      email: storeEmail,
      phone: storePhone,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      gstNumber: gstNumber || null,
      isApproved: false,
      isActive: true,
    }, { transaction });

    console.log('✅ Store created:', store.id);

    const admin = await User.create({
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: UserRole.ADMIN,
      storeId: store.id,
      isActive: false,
    } as any, { transaction });

    console.log('✅ Admin created:', admin.id);

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: 'Store registration successful. Awaiting approval.',
      data: {
        storeId: store.id,
        storeName: store.name,
      },
    });
  } catch (error: any) {
    if (transaction) await transaction.rollback();
    console.error('❌ Registration error:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

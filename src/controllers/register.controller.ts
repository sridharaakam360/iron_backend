import { Request, Response } from 'express';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

export const registerStore = async (req: Request, res: Response) => {
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
    const hashedPassword = await bcrypt.hash(password, 6);
    console.log('✅ Password hashed');

    console.log('💾 Creating store and admin...');
    const store = await prisma.store.create({
      data: {
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
      },
    });

    console.log('✅ Store created:', store.id);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: 'ADMIN',
        storeId: store.id,
        isActive: false,
      },
    });

    console.log('✅ Admin created:', admin.id);

    res.status(201).json({
      success: true,
      message: 'Store registration successful. Awaiting approval.',
      data: {
        storeId: store.id,
        storeName: store.name,
      },
    });
  } catch (error: any) {
    console.error('❌ Registration error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

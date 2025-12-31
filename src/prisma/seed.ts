import { Prisma } from '../generated/prisma';
import { PasswordUtil } from '../utils/password';
import { prisma } from '../config/database';

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await PasswordUtil.hash('Admin@123');

  // Create SuperAdmin user (no store)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@ironpress.com' },
    update: {},
    create: {
      email: 'superadmin@ironpress.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ SuperAdmin user created:', superAdmin.email);

  // Create a demo store
  const store = await prisma.store.upsert({
    where: { email: 'store@ironpress.com' },
    update: {},
    create: {
      name: 'IronPress Demo Store',
      email: 'store@ironpress.com',
      phone: '9876543210',
      address: '123 MG Road, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      gstNumber: 'GST123456',
      isApproved: true,
      isActive: true,
    },
  });

  console.log('✅ Demo store created:', store.name);

  // Create store admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ironpress.com' },
    update: {},
    create: {
      email: 'admin@ironpress.com',
      password: hashedPassword,
      name: 'Store Admin',
      role: 'ADMIN',
      storeId: store.id,
    },
  });

  console.log('✅ Store admin created:', admin.email);

  // Create store settings for notifications
  await prisma.storeSetting.createMany({
    data: [
      {
        storeId: store.id,
        key: 'notifications_email_enabled',
        value: 'true',
      },
      {
        storeId: store.id,
        key: 'notifications_whatsapp_enabled',
        value: 'false',
      },
      {
        storeId: store.id,
        key: 'notifications_sms_enabled',
        value: 'false',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Store notification settings created');

  const categories = [
    { name: 'Shirt', price: 15, icon: '👔' },
    { name: 'Pants', price: 20, icon: '👖' },
    { name: 'Lowers', price: 12, icon: '🩳' },
    { name: 'Saree', price: 50, icon: '🥻' },
    { name: 'Suit', price: 80, icon: '🤵' },
    { name: 'Kurta', price: 25, icon: '👘' },
    { name: 'Dress', price: 35, icon: '👗' },
    { name: 'Blazer', price: 45, icon: '🧥' },
    { name: 'T-Shirt', price: 10, icon: '👕' },
    { name: 'Bedsheet', price: 30, icon: '🛏️' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        storeId_name: {
          storeId: store.id,
          name: category.name,
        }
      },
      update: {},
      create: {
        storeId: store.id,
        name: category.name,
        price: new Prisma.Decimal(category.price),
        icon: category.icon,
      },
    });
  }

  console.log('✅ Categories created:', categories.length);

  const customer1 = await prisma.customer.upsert({
    where: {
      storeId_phone: {
        storeId: store.id,
        phone: '9876543210',
      }
    },
    update: {},
    create: {
      storeId: store.id,
      name: 'Rajesh Kumar',
      phone: '9876543210',
      email: 'rajesh@example.com',
      address: '123 MG Road, Bangalore',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: {
      storeId_phone: {
        storeId: store.id,
        phone: '8765432109',
      }
    },
    update: {},
    create: {
      storeId: store.id,
      name: 'Priya Sharma',
      phone: '8765432109',
      email: 'priya@example.com',
      address: '456 Park Street, Mumbai',
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: {
      storeId_phone: {
        storeId: store.id,
        phone: '7654321098',
      }
    },
    update: {},
    create: {
      storeId: store.id,
      name: 'Amit Patel',
      phone: '7654321098',
      email: null,
      address: null,
    },
  });

  console.log('✅ Sample customers created: 3');

  const allCategories = await prisma.category.findMany();

  const shirtCategory = allCategories.find((c) => c.name === 'Shirt');
  const pantsCategory = allCategories.find((c) => c.name === 'Pants');
  const sareeCategory = allCategories.find((c) => c.name === 'Saree');
  const tshirtCategory = allCategories.find((c) => c.name === 'T-Shirt');

  if (shirtCategory && pantsCategory && tshirtCategory) {
    const bill1Items = [
      {
        categoryId: shirtCategory.id,
        quantity: 3,
        price: shirtCategory.price,
        subtotal: shirtCategory.price.mul(3),
      },
      {
        categoryId: pantsCategory.id,
        quantity: 2,
        price: pantsCategory.price,
        subtotal: pantsCategory.price.mul(2),
      },
    ];

    const bill1Total = bill1Items.reduce(
      (sum, item) => sum.add(item.subtotal),
      new Prisma.Decimal(0)
    );

    await prisma.bill.create({
      data: {
        storeId: store.id,
        billNumber: 'BILL-001',
        customerId: customer1.id,
        totalAmount: bill1Total,
        status: 'PENDING',
        notes: 'Express service requested',
        items: {
          create: bill1Items,
        },
      },
    });

    console.log('✅ Sample bill 1 created');
  }

  if (sareeCategory && tshirtCategory) {
    const bill2Items = [
      {
        categoryId: sareeCategory.id,
        quantity: 2,
        price: sareeCategory.price,
        subtotal: sareeCategory.price.mul(2),
      },
      {
        categoryId: tshirtCategory.id,
        quantity: 5,
        price: tshirtCategory.price,
        subtotal: tshirtCategory.price.mul(5),
      },
    ];

    const bill2Total = bill2Items.reduce(
      (sum, item) => sum.add(item.subtotal),
      new Prisma.Decimal(0)
    );

    await prisma.bill.create({
      data: {
        storeId: store.id,
        billNumber: 'BILL-002',
        customerId: customer2.id,
        totalAmount: bill2Total,
        status: 'COMPLETED',
        completedAt: new Date(),
        items: {
          create: bill2Items,
        },
      },
    });

    console.log('✅ Sample bill 2 created');
  }

  if (shirtCategory) {
    const bill3Items = [
      {
        categoryId: shirtCategory.id,
        quantity: 4,
        price: shirtCategory.price,
        subtotal: shirtCategory.price.mul(4),
      },
    ];

    const bill3Total = bill3Items.reduce(
      (sum, item) => sum.add(item.subtotal),
      new Prisma.Decimal(0)
    );

    await prisma.bill.create({
      data: {
        storeId: store.id,
        billNumber: 'BILL-003',
        customerId: customer3.id,
        totalAmount: bill3Total,
        status: 'PENDING',
        items: {
          create: bill3Items,
        },
      },
    });

    console.log('✅ Sample bill 3 created');
  }

  console.log('🎉 Seeding completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('SuperAdmin - Email: superadmin@ironpress.com, Password: Admin@123');
  console.log('Store Admin - Email: admin@ironpress.com, Password: Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import 'reflect-metadata';
import { Store, User, UserRole, Category, Customer, StoreSetting, Subscription, SubscriptionPlan, SubscriptionStatus, BillingCycle } from './models';
import { PasswordUtil } from './utils/password';
import { sequelize } from './config/database';

async function main() {
    console.log('🌱 Seeding database...');

    try {
        await sequelize.authenticate();
        console.log('✅ Connection has been established successfully.');

        // Sync all models
        await sequelize.sync({ force: true });
        console.log('✅ All models were synchronized successfully.');

        const hashedPassword = await PasswordUtil.hash('Admin@123');

        // Create SuperAdmin user (no store)
        const superAdmin = await User.create({
            email: 'superadmin@ironpress.com',
            password: hashedPassword,
            name: 'Super Admin',
            role: UserRole.SUPER_ADMIN,
        } as any);

        console.log('✅ SuperAdmin user created:', (superAdmin as any).email);

        // Create a demo store
        const store = await Store.create({
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
        } as any);

        console.log('✅ Demo store created:', (store as any).name);

        // Create store admin
        const admin = await User.create({
            email: 'admin@ironpress.com',
            password: hashedPassword,
            name: 'Store Admin',
            role: UserRole.ADMIN,
            storeId: (store as any).id,
            isActive: true,
        } as any);

        console.log('✅ Store admin created:', (admin as any).email);

        // Create store settings for notifications
        await StoreSetting.bulkCreate([
            {
                storeId: (store as any).id,
                key: 'notifications_email_enabled',
                value: 'true',
            },
            {
                storeId: (store as any).id,
                key: 'notifications_whatsapp_enabled',
                value: 'false',
            },
            {
                storeId: (store as any).id,
                key: 'notifications_sms_enabled',
                value: 'false',
            },
            {
                storeId: (store as any).id,
                key: 'currency',
                value: 'INR',
            }
        ]);

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

        for (const cat of categories) {
            await Category.create({
                storeId: (store as any).id,
                name: cat.name,
                price: cat.price,
                icon: cat.icon,
            } as any);
        }

        console.log('✅ Categories created:', categories.length);

        await Customer.create({
            storeId: (store as any).id,
            name: 'Rajesh Kumar',
            phone: '9876543210',
            email: 'rajesh@example.com',
            address: '123 MG Road, Bangalore',
        } as any);

        await Customer.create({
            storeId: (store as any).id,
            name: 'Priya Sharma',
            phone: '8765432109',
            email: 'priya@example.com',
            address: '456 Park Street, Mumbai',
        } as any);

        console.log('✅ Sample customers created: 2');

        // Create Subscription
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        await Subscription.create({
            storeId: (store as any).id,
            plan: SubscriptionPlan.PRO,
            status: SubscriptionStatus.ACTIVE,
            startDate: new Date(),
            endDate,
            renewalDate: endDate,
            amount: 999,
            billingCycle: BillingCycle.YEARLY,
        } as any);

        console.log('✅ Demo subscription created');

        console.log('🎉 Seeding completed successfully!');
        console.log('\n📝 Login credentials:');
        console.log('SuperAdmin - Email: superadmin@ironpress.com, Password: Admin@123');
        console.log('Store Admin - Email: admin@ironpress.com, Password: Admin@123');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

main();

import { Router } from 'express';
import authRoutes from './auth.routes';
import billRoutes from './bill.routes';
import customerRoutes from './customer.routes';
import categoryRoutes from './category.routes';
import notificationRoutes from './notification.routes';
import storeRoutes from './store.routes';
import registerRoutes from './register.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import serviceTypeRoutes from './serviceType.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/stores', registerRoutes); // New simplified registration
router.use('/stores', storeRoutes);
router.use('/users', userRoutes); // Employee management
router.use('/admin', adminRoutes); // Super admin routes
router.use('/bills', billRoutes);
router.use('/customers', customerRoutes);
router.use('/categories', categoryRoutes);
router.use('/service-types', serviceTypeRoutes);
router.use('/notifications', notificationRoutes);

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;

import { Router } from 'express';
import {
  getAdminStats,
  getExpiringSubscriptions,
  getAllSubscriptions,
  createSubscription,
  updateSubscriptionStatus,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(authorize(['SUPER_ADMIN']));

// Dashboard stats
router.get('/stats', getAdminStats);

// Subscription management
router.get('/subscriptions/expiring-soon', getExpiringSubscriptions);
router.get('/subscriptions', getAllSubscriptions);
router.post('/subscriptions', createSubscription);
router.patch('/subscriptions/:id', updateSubscriptionStatus);

export default router;

import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All routes require authentication and ADMIN role
router.get('/', authenticate, authorize(['ADMIN']), userController.getStoreUsers);
router.post('/', authenticate, authorize(['ADMIN']), userController.createEmployee);
router.patch('/:id/toggle-status', authenticate, authorize(['ADMIN']), userController.toggleUserStatus);
router.delete('/:id', authenticate, authorize(['ADMIN']), userController.deleteEmployee);

export default router;

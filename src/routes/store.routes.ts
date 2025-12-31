import { Router } from 'express';
import { body } from 'express-validator';
import { storeController } from '../controllers/store.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validator';

const router = Router();

// Test endpoint to verify connection
router.get('/test', (req, res) => {
  console.log('✅ TEST endpoint hit!');
  res.json({ success: true, message: 'Store routes working!' });
});

// Simple POST test to check if POST works
router.post('/test-post', (req, res) => {
  console.log('✅ POST TEST endpoint hit!', req.body);
  res.json({ success: true, message: 'POST working!', received: req.body });
});

// Public route - Store registration
const registerValidation = [
  body('storeName').notEmpty().withMessage('Store name is required'),
  body('storeEmail').isEmail().withMessage('Valid store email is required'),
  body('storePhone').notEmpty().withMessage('Store phone is required'),
  body('adminName').notEmpty().withMessage('Admin name is required'),
  body('adminEmail').isEmail().withMessage('Valid admin email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

router.post('/register', registerValidation, validate, storeController.registerStore);

// Protected routes - SuperAdmin only
router.get('/', authenticate, authorize(['SUPER_ADMIN']), storeController.getAllStores);
router.get('/:id', authenticate, authorize(['SUPER_ADMIN']), storeController.getStoreById);
router.post('/:id/approve', authenticate, authorize(['SUPER_ADMIN']), storeController.approveStore);
router.post('/:id/reject', authenticate, authorize(['SUPER_ADMIN']), storeController.rejectStore);
router.put('/:id', authenticate, authorize(['SUPER_ADMIN']), storeController.updateStore);
router.post('/:id/toggle-status', authenticate, authorize(['SUPER_ADMIN']), storeController.toggleStoreStatus);

// Settings routes - Admin can access their own store settings
router.get('/settings/my-store', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE']), storeController.getStoreSettings);;
router.put('/settings/my-store', authenticate, authorize(['ADMIN']), storeController.updateStoreSettings);

export default router;

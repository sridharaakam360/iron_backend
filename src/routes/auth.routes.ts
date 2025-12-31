import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();
const authController = new AuthController();

const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', validate(registerValidation), authController.register.bind(authController));
router.post('/login', validate(loginValidation), authController.login.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));
router.get('/me', authenticate, authController.getProfile.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

// Profile and password update routes
router.put('/profile', authenticate, authController.updateProfile.bind(authController));
router.put('/change-password', authenticate, authController.changePassword.bind(authController));

export default router;

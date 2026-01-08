import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { upload } from '../config/upload.config';

const router = Router();

// Upload store logo - ADMIN only
router.post(
    '/logo',
    authenticate,
    authorize(['ADMIN']),
    upload.single('logo'),
    uploadController.uploadLogo
);

// Upload profile picture - All authenticated users
router.post(
    '/profile',
    authenticate,
    upload.single('profile'),
    uploadController.uploadProfile
);

export default router;

import { Router } from 'express';
import { body } from 'express-validator';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();
const notificationController = new NotificationController();

const sendNotificationValidation = [
  body('type').isIn(['SMS', 'EMAIL', 'WHATSAPP']).withMessage('Type must be SMS, EMAIL or WHATSAPP'),
];

router.post('/bills/:billId/send', authenticate, validate(sendNotificationValidation), notificationController.sendBillNotification.bind(notificationController));
router.get('/history', authenticate, notificationController.getNotificationHistory.bind(notificationController));

export default router;

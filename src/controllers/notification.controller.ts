import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { NotificationService } from '../services/notification.service';
import { ApiResponseUtil } from '../utils/response';

const notificationService = new NotificationService();

export class NotificationController {
  async sendBillNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { billId } = req.params;
      const { type } = req.body;

      const notification = await notificationService.sendBillNotification(billId, type);
      ApiResponseUtil.success(res, notification, 'Notification sent successfully');
    } catch (error) {
      next(error);
    }
  }

  async getNotificationHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { billId } = req.query;
      const notifications = await notificationService.getNotificationHistory(billId as string);
      ApiResponseUtil.success(res, notifications, 'Notification history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { Notification, NotificationStatus, NotificationType } from '../models/Notification';
import { Bill } from '../models/Bill';
import { Customer } from '../models/Customer';
import { BillItem } from '../models/BillItem';
import { Category } from '../models/Category';
import { logger } from '../utils/logger';

export class NotificationService {
  private twilioClient: twilio.Twilio | null = null;
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTwilio();
    this.initializeEmail();
  }

  private initializeTwilio() {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      try {
        this.twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
        logger.info('Twilio client initialized');
      } catch (error) {
        logger.warn('Failed to initialize Twilio client', error);
      }
    } else {
      logger.warn('Twilio credentials not configured');
    }
  }

  private initializeEmail() {
    if (env.SMTP_USER && env.SMTP_PASS) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
        logger.info('Email transporter initialized');
      } catch (error) {
        logger.warn('Failed to initialize email transporter', error);
      }
    } else {
      logger.warn('Email credentials not configured');
    }
  }

  async sendSMS(phone: string, message: string): Promise<boolean> {
    if (!this.twilioClient) {
      logger.warn('SMS not sent: Twilio not configured');
      return false;
    }

    try {
      await this.twilioClient.messages.create({
        body: message,
        from: env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      logger.info(`SMS sent to ${phone}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send SMS to ${phone}`, error);
      return false;
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.emailTransporter) {
      logger.warn('Email not sent: Email transporter not configured');
      return false;
    }

    try {
      await this.emailTransporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
      });

      logger.info(`Email sent to ${to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${to}`, error);
      return false;
    }
  }

  async sendBillNotification(billId: string, type: NotificationType = NotificationType.SMS) {
    const bill = await Bill.findByPk(billId, {
      include: [
        { model: Customer },
        { model: BillItem, include: [Category] },
      ],
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    const itemsList = bill.items
      .map((item) => `${item.category.name} x${item.quantity} - ₹${item.subtotal}`)
      .join('\n');

    const message = `
Dear ${bill.customer.name},

Your laundry bill #${bill.billNumber} is ready!

Items:
${itemsList}

Total Amount: ₹${bill.totalAmount}
Status: ${bill.status}

Thank you for choosing ${env.APP_NAME}!
Visit: ${env.APP_URL}
    `.trim();

    let success = false;

    if (type === NotificationType.SMS && bill.customer.phone) {
      const smsMessage = `${env.APP_NAME}: Bill #${bill.billNumber} ready! Total: ₹${bill.totalAmount}. Thank you!`;
      success = await this.sendSMS(bill.customer.phone, smsMessage);
    } else if (type === NotificationType.EMAIL && bill.customer.email) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Bill Ready - ${env.APP_NAME}</h2>
          <p>Dear <strong>${bill.customer.name}</strong>,</p>
          <p>Your laundry bill <strong>#${bill.billNumber}</strong> is ready!</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Item</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${bill.items
          .map(
            (item) => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">${item.category.name}</td>
                  <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${item.subtotal}</td>
                </tr>
              `
          )
          .join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td colspan="2" style="padding: 10px; border: 1px solid #ddd;">Total</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${bill.totalAmount}</td>
              </tr>
            </tfoot>
          </table>

          <p><strong>Status:</strong> ${bill.status}</p>
          <p>Thank you for choosing <strong>${env.APP_NAME}</strong>!</p>
          <p style="color: #6b7280; font-size: 12px;">Visit us at: <a href="${env.APP_URL}">${env.APP_URL}</a></p>
        </div>
      `;

      success = await this.sendEmail(
        bill.customer.email,
        `Bill Ready #${bill.billNumber} - ${env.APP_NAME}`,
        emailHtml
      );
    }

    const notification = await Notification.create({
      billId,
      type,
      status: success ? NotificationStatus.SENT : NotificationStatus.FAILED,
      recipient: type === NotificationType.SMS ? bill.customer.phone : bill.customer.email || '',
      message,
      sentAt: success ? new Date() : null,
      error: success ? null : 'Failed to send notification',
    } as any);

    return notification;
  }

  async getNotificationHistory(billId?: string) {
    const where: any = {};
    if (billId) {
      where.billId = billId;
    }

    const notifications = await Notification.findAll({
      where,
      include: [
        {
          model: Bill,
          include: [{ model: Customer }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return notifications;
  }
}

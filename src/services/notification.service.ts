import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { Notification, NotificationStatus, NotificationType } from '../models/Notification';
import { Bill } from '../models/Bill';
import { Customer } from '../models/Customer';
import { BillItem } from '../models/BillItem';
import { Category } from '../models/Category';
import { StoreSetting } from '../models/StoreSetting';
import { logger } from '../utils/logger';
import QRCode from 'qrcode';
import { Store } from '../models/Store';

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

  private async getSettings(storeId: string) {
    const settings = await StoreSetting.findAll({
      where: { storeId },
    });
    const flatSettings: any = {};
    settings.forEach(s => {
      flatSettings[s.key] = s.value;
    });
    return flatSettings;
  }

  private async getEmailTransporter(settings: any) {
    if (settings.emailProvider === 'smtp') {
      return nodemailer.createTransport({
        host: settings.smtpHost || env.SMTP_HOST,
        port: parseInt(settings.smtpPort) || env.SMTP_PORT,
        secure: settings.smtpPort === '465' || env.SMTP_SECURE,
        auth: {
          user: settings.smtpUser || env.SMTP_USER,
          pass: settings.smtpPass || env.SMTP_PASS,
        },
      });
    }
    // Add third-party logic if needed
    return this.emailTransporter;
  }

  async sendSMS(phone: string, message: string, storeId?: string): Promise<boolean> {
    let client = this.twilioClient;
    let from = env.TWILIO_PHONE_NUMBER;

    if (storeId) {
      const settings = await this.getSettings(storeId);
      if (settings.smsProvider === 'twilio' && settings.smsApiKey) {
        // settings.smsApiKey could be accountSid:authToken
        const [sid, token] = settings.smsApiKey.split(':');
        if (sid && token) {
          client = twilio(sid, token);
          from = settings.smsSenderId || env.TWILIO_PHONE_NUMBER;
        }
      }
    }

    if (!client) {
      logger.warn('SMS not sent: Twilio not configured');
      return false;
    }

    try {
      await client.messages.create({
        body: message,
        from: from,
        to: phone,
      });

      logger.info(`SMS sent to ${phone}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send SMS to ${phone}`, error);
      return false;
    }
  }

  async sendEmail(to: string, subject: string, html: string, storeId?: string): Promise<boolean> {
    let transporter = this.emailTransporter;
    let from = env.EMAIL_FROM;

    if (storeId) {
      const settings = await this.getSettings(storeId);
      transporter = await this.getEmailTransporter(settings);

      const storeName = settings.senderEmailName || settings.storeName || env.APP_NAME;
      from = settings.emailFromEmail
        ? `"${storeName}" <${settings.emailFromEmail}>`
        : `"${storeName}" <${env.EMAIL_FROM}>`;
    }

    if (!transporter) {
      logger.warn('Email not sent: Email transporter not configured');
      return false;
    }

    try {
      await transporter.sendMail({
        from,
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

  async sendWhatsApp(phone: string, message: string, storeId: string): Promise<boolean> {
    const settings = await this.getSettings(storeId);
    if (settings.whatsappNotificationsEnabled === 'false') return false;

    // Basic implementation for Twilio WhatsApp
    if (settings.whatsappProvider === 'twilio' && settings.whatsappApiKey) {
      const [sid, token] = settings.whatsappApiKey.split(':');
      if (sid && token) {
        const client = twilio(sid, token);
        try {
          await client.messages.create({
            body: message,
            from: `whatsapp:${settings.whatsappNumber || env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${phone}`,
          });
          logger.info(`WhatsApp sent to ${phone}`);
          return true;
        } catch (error) {
          logger.error(`Failed to send WhatsApp to ${phone}`, error);
          return false;
        }
      }
    }
    logger.warn(`WhatsApp provider ${settings.whatsappProvider} not implemented or configured`);
    return false;
  }

  async sendBillNotification(billId: string, type: NotificationType = NotificationType.SMS) {
    const bill = await Bill.findByPk(billId, {
      include: [
        { model: Customer },
        { model: BillItem, include: [Category] },
        { model: Store },
      ],
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    const settings = await this.getSettings(bill.storeId);
    const storeName = settings.senderEmailName || bill.store?.name || env.APP_NAME;
    const itemsList = bill.items
      .map((item) => `${item.category?.name || 'Item'} x${item.quantity} - ₹${item.subtotal}`)
      .join('\n');

    let paymentInfo = '';
    let qrCodeBase64 = '';

    if (bill.paymentMethod === 'ONLINE' || bill.paymentMethod === 'UPI') {
      if (settings.primaryUpiId) {
        paymentInfo += `\n\n💸 *TO PAY ONLINE* 💸\nUPI ID: ${settings.primaryUpiId}`;

        // Generate UPI QR Code
        const upiUrl = `upi://pay?pa=${settings.primaryUpiId}&pn=${encodeURIComponent(storeName)}&am=${bill.totalAmount}&cu=INR`;
        try {
          qrCodeBase64 = await QRCode.toDataURL(upiUrl, {
            margin: 2,
            width: 200,
            errorCorrectionLevel: 'M'
          });
          logger.info(`Generated QR Code for bill ${bill.billNumber}, length: ${qrCodeBase64.length}`);
        } catch (err) {
          logger.error('Failed to generate QR Code', err);
        }

        if (settings.secondaryUpiId) {
          paymentInfo += `\nAlt UPI: ${settings.secondaryUpiId}`;
        }
      }
      if (settings.bankName && settings.accountNumber) {
        paymentInfo += `\n\n🏛 *BANK TRANSFER*\nBank: ${settings.bankName}\nA/C: ${settings.accountNumber}\nIFSC: ${settings.ifscCode}`;
      }
    }

    const message = `
Dear ${bill.customer.name},

Your laundry bill #${bill.billNumber} from ${storeName} is ready!

Items:
${itemsList}

Total Amount: ₹${bill.totalAmount}
Status: ${bill.status}
${paymentInfo}

Thank you for choosing ${storeName}!
Visit: ${env.APP_URL}
    `.trim();

    let success = false;

    if (type === NotificationType.SMS && bill.customer.phone) {
      // Check store setting for SMS
      const settings = await this.getSettings(bill.storeId);
      if (settings.smsNotificationsEnabled === 'false') {
        logger.info(`SMS skipped for store ${bill.storeId}: disabled`);
        return;
      }

      let smsMessage = `${storeName}: Bill #${bill.billNumber} ready! Total: ₹${bill.totalAmount}. Thank you!`;
      if ((bill.paymentMethod === 'ONLINE' || bill.paymentMethod === 'UPI') && settings.primaryUpiId) {
        smsMessage = `${storeName}: Bill #${bill.billNumber}. Total: ₹${bill.totalAmount}. Pay via UPI: ${settings.primaryUpiId}`;
      }
      success = await this.sendSMS(bill.customer.phone, smsMessage, bill.storeId);
    } else if (type === NotificationType.WHATSAPP && bill.customer.phone) {
      // Check store setting for WhatsApp
      const settings = await this.getSettings(bill.storeId);
      if (settings.whatsappNotificationsEnabled === 'false') {
        logger.info(`WhatsApp skipped for store ${bill.storeId}: disabled`);
        return;
      }

      let whatsappMessage = `*Bill Ready - ${storeName}*\n\nDear ${bill.customer.name},\nYour bill #${bill.billNumber} from *${storeName}* is ready!\nTotal: *₹${bill.totalAmount}*\n\nThank you!`;
      if (bill.paymentMethod === 'ONLINE' || bill.paymentMethod === 'UPI') {
        whatsappMessage = `*Bill Ready - ${storeName}*\n\nDear ${bill.customer.name},\nYour bill #${bill.billNumber} from *${storeName}* is ready!\nTotal: *₹${bill.totalAmount}*\n\n*PAYMENT DETAILS*\n`;
        if (settings.primaryUpiId) {
          whatsappMessage += `UPI ID: *${settings.primaryUpiId}* (Open UPI app and pay)\n`;
        }
        if (settings.bankName) {
          whatsappMessage += `Bank: *${settings.bankName}*\nA/C: *${settings.accountNumber}*\nIFSC: *${settings.ifscCode}*\n`;
        }
        whatsappMessage += `\nThank you!`;
      }
      success = await this.sendWhatsApp(bill.customer.phone, whatsappMessage, bill.storeId);
    } else if (type === NotificationType.EMAIL && bill.customer.email) {
      // Check store setting for Email
      const settings = await this.getSettings(bill.storeId);
      if (settings.emailNotificationsEnabled === 'false') {
        logger.info(`Email skipped for store ${bill.storeId}: disabled`);
        return;
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Bill Ready - ${storeName}</h2>
          <p>Dear <strong>${bill.customer.name}</strong>,</p>
          <p>Your laundry bill <strong>#${bill.billNumber}</strong> from <strong>${storeName}</strong> is ready!</p>

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

          ${(bill.paymentMethod === 'ONLINE' || bill.paymentMethod === 'UPI') ? `
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #0369a1; font-weight: bold; text-align: left;">💸 ONLINE PAYMENT DETAILS</p>
            ${settings.primaryUpiId ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 5px 0; text-align: left;"><strong>UPI ID:</strong> ${settings.primaryUpiId}</p>
                ${qrCodeBase64 ? `<img src="${qrCodeBase64}" width="150" height="150" alt="UPI QR Code" style="margin: 10px auto; display: block; border: 1px solid #ddd; padding: 5px; background: #fff;" />` : ''}
                <p style="font-size: 11px; color: #666;">Scan to pay ₹${bill.totalAmount}</p>
              </div>
            ` : ''}
            ${settings.secondaryUpiId ? `<p style="margin: 5px 0; text-align: left;"><strong>Alt UPI:</strong> ${settings.secondaryUpiId}</p>` : ''}
            ${settings.bankName ? `
              <div style="margin-top: 15px; pt-15px; border-top: 1px dashed #bae6fd; text-align: left;">
                <p style="margin: 10px 0 5px 0;"><strong>BANK TRANSFER:</strong></p>
                <p style="margin: 3px 0;">Bank: ${settings.bankName}</p>
                <p style="margin: 3px 0;">Account: ${settings.accountNumber}</p>
                <p style="margin: 3px 0;">IFSC: ${settings.ifscCode}</p>
              </div>
            ` : ''}
          </div>
          ` : ''}

          <p><strong>Status:</strong> ${bill.status}</p>
          <p>Thank you for choosing <strong>${storeName}</strong>!</p>
          <p style="color: #6b7280; font-size: 12px;">Visit us at: <a href="${env.APP_URL}">${env.APP_URL}</a></p>
        </div>
      `;

      success = await this.sendEmail(
        bill.customer.email,
        `Bill Ready #${bill.billNumber} - ${storeName}`,
        emailHtml,
        bill.storeId
      );
    }

    const notification = await Notification.create({
      billId,
      type,
      status: success ? NotificationStatus.SENT : NotificationStatus.FAILED,
      recipient: type === NotificationType.EMAIL ? bill.customer.email : bill.customer.phone || '',
      message,
      sentAt: success ? new Date() : null,
      error: success ? null : 'Failed to send notification',
    } as any);

    return notification;
  }

  async sendPaymentConfirmation(billId: string) {
    const bill = await Bill.findByPk(billId, {
      include: [{ model: Customer }, { model: Store }],
    });

    if (!bill || !bill.customer.email) return;

    // Check store setting
    const settings = await this.getSettings(bill.storeId);
    const storeName = settings.senderEmailName || bill.store?.name || env.APP_NAME;

    if (settings.emailNotificationsEnabled === 'false') {
      logger.info(`Email notification skipped for store ${bill.storeId}: disabled in settings`);
      return;
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Received</h1>
        </div>
        <div style="padding: 24px; color: #374151;">
          <p>Dear <strong>${bill.customer.name}</strong>,</p>
          <p>Thank you! We have received your payment for bill <strong>#${bill.billNumber}</strong>.</p>
          
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Amount Paid</p>
            <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold; color: #111827;">₹${bill.totalAmount}</p>
          </div>

          <p>Your order is currently in progress. We will notify you once it's ready for collection.</p>
          <p>Thank you for choosing <strong>${storeName}</strong>!</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
          ${storeName} | <a href="${env.APP_URL}" style="color: #3b82f6;">${env.APP_URL}</a>
        </div>
      </div>
    `;

    return await this.sendEmail(
      bill.customer.email,
      `Payment Confirmation - #${bill.billNumber} - ${storeName}`,
      emailHtml,
      bill.storeId
    );
  }

  async sendCollectionReminder(billId: string) {
    const bill = await Bill.findByPk(billId, {
      include: [{ model: Customer }, { model: BillItem, include: [Category] }, { model: Store }],
    });

    if (!bill) return;

    const settings = await this.getSettings(bill.storeId);
    const storeName = settings.senderEmailName || bill.store?.name || env.APP_NAME;
    const isPaid = bill.paymentStatus === 'PAID';
    const message = `Your clothes are ready for collection at ${storeName}! Bill #${bill.billNumber}. Status: ${bill.paymentStatus}. ${!isPaid ? `Please pay ₹${bill.totalAmount}.` : ''} Thank you!`;

    // SMS
    if (bill.customer.phone && settings.smsNotificationsEnabled !== 'false') {
      this.sendSMS(bill.customer.phone, message, bill.storeId).catch(err =>
        console.error(`Failed to send collection SMS for bill ${bill.id}:`, err)
      );
    }

    // WhatsApp
    if (bill.customer.phone && settings.whatsappNotificationsEnabled !== 'false') {
      const whatsappMsg = `*Clothes Ready for Collection!*\n\nBill #${bill.billNumber}\nStore: *${storeName}*\nStatus: *${bill.paymentStatus}*\n${!isPaid ? `Amount to pay: *₹${bill.totalAmount}*` : ''}\n\nThank you for choosing ${storeName}!`;
      this.sendWhatsApp(bill.customer.phone, whatsappMsg, bill.storeId).catch(err =>
        console.error(`Failed to send collection WhatsApp for bill ${bill.id}:`, err)
      );
    }

    // Email
    if (bill.customer.email && settings.emailNotificationsEnabled !== 'false') {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Ready for Collection</h1>
          </div>
          <div style="padding: 24px; color: #374151;">
            <p>Dear <strong>${bill.customer.name}</strong>,</p>
            <p>Exciting news! Your clothes are ready for collection at <strong>${storeName}</strong>.</p>
            
            <div style="margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
              <p style="margin: 0 0 8px 0; font-weight: bold;">Bill #${bill.billNumber}</p>
              <p style="margin: 0; font-size: 14px;">Status: <span style="color: ${isPaid ? '#10b981' : '#f59e0b'}; font-weight: bold;">${isPaid ? 'PAID' : 'PAYMENT PENDING'}</span></p>
              ${!isPaid ? `<p style="margin: 8px 0 0 0; font-size: 14px;">Please pay <strong>₹${bill.totalAmount}</strong> at the counter.</p>` : ''}
            </div>

            <p>Please visit us during our working hours to collect your items.</p>
            <p>See you soon!</p>
          </div>
          <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
            ${storeName} | <a href="${env.APP_URL}" style="color: #3b82f6;">${env.APP_URL}</a>
          </div>
        </div>
      `;

      this.sendEmail(
        bill.customer.email,
        `Clothes Ready for Collection - #${bill.billNumber} - ${storeName}`,
        emailHtml,
        bill.storeId
      ).catch(err => console.error(`Failed to send collection email for bill ${bill.id}:`, err));
    }
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

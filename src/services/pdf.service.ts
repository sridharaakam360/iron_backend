import PDFDocument from 'pdfkit';
import { Bill } from '../models/Bill';
import { Customer } from '../models/Customer';
import { BillItem } from '../models/BillItem';
import { Category } from '../models/Category';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { Response } from 'express';

export class PdfService {
  async generateBillPdf(billId: string, res: Response) {
    const bill = await Bill.findByPk(billId, {
      include: [
        { model: Customer },
        { model: BillItem, include: [Category] },
      ],
    });

    if (!bill) {
      throw new AppError('Bill not found', 404);
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bill-${bill.billNumber}.pdf`);

    doc.pipe(res);

    doc.fontSize(24).text(env.APP_NAME, { align: 'center' });
    doc.fontSize(10).text('Laundry & Ironing Services', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('INVOICE', { align: 'center', underline: true });
    doc.moveDown();

    const invoiceTop = doc.y;

    doc.fontSize(10);
    doc.text(`Bill Number: ${bill.billNumber}`, 50, invoiceTop);
    doc.text(`Date: ${new Date(bill.createdAt).toLocaleDateString()}`, 50, invoiceTop + 15);
    doc.text(`Status: ${bill.status}`, 50, invoiceTop + 30);

    doc.text(`Customer: ${bill.customer.name}`, 300, invoiceTop);
    doc.text(`Phone: ${bill.customer.phone}`, 300, invoiceTop + 15);
    if (bill.customer.email) {
      doc.text(`Email: ${bill.customer.email}`, 300, invoiceTop + 30);
    }

    doc.moveDown(3);

    const tableTop = doc.y;
    const itemX = 50;
    const quantityX = 300;
    const priceX = 370;
    const amountX = 450;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', itemX, tableTop);
    doc.text('Quantity', quantityX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Amount', amountX, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    doc.font('Helvetica');
    let yPosition = tableTop + 25;

    bill.items.forEach((item) => {
      doc.text(item.category.name, itemX, yPosition);
      doc.text(item.quantity.toString(), quantityX, yPosition);
      doc.text(`₹${item.price}`, priceX, yPosition);
      doc.text(`₹${item.subtotal}`, amountX, yPosition);
      yPosition += 20;
    });

    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

    yPosition += 10;
    doc.font('Helvetica-Bold');
    doc.fontSize(12);
    doc.text('Total:', 370, yPosition);
    doc.text(`₹${bill.totalAmount}`, amountX, yPosition);

    if (bill.notes) {
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica');
      doc.text('Notes:', 50);
      doc.text(bill.notes, 50, doc.y, { width: 500 });
    }

    doc.moveDown(3);
    doc.fontSize(8).font('Helvetica');
    doc.text('Thank you for your business!', { align: 'center' });
    doc.text(env.APP_URL, { align: 'center' });

    doc.end();
  }
}

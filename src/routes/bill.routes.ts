import { Router } from 'express';
import { body } from 'express-validator';
import { BillController } from '../controllers/bill.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { PdfService } from '../services/pdf.service';

const router = Router();
const billController = new BillController();
const pdfService = new PdfService();

const createBillValidation = [
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerPhone').notEmpty().withMessage('Customer phone is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.categoryId').notEmpty().withMessage('Category ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

const updateBillValidation = [
  body('status').optional().isIn(['PENDING', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
];

router.post('/', authenticate, validate(createBillValidation), billController.createBill.bind(billController));
router.get('/', authenticate, billController.getBills.bind(billController));
router.get('/stats', authenticate, billController.getDashboardStats.bind(billController));
router.get('/:id', authenticate, billController.getBillById.bind(billController));
router.put('/:id', authenticate, validate(updateBillValidation), billController.updateBill.bind(billController));
router.delete('/:id', authenticate, billController.deleteBill.bind(billController));

router.get('/:id/pdf', authenticate, async (req, res, next) => {
  try {
    await pdfService.generateBillPdf(req.params.id, res);
  } catch (error) {
    next(error);
  }
});

export default router;

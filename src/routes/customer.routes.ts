import { Router } from 'express';
import { body } from 'express-validator';
import { CustomerController } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();
const customerController = new CustomerController();

const createCustomerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
];

const updateCustomerValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
];

router.post('/', authenticate, validate(createCustomerValidation), customerController.createCustomer.bind(customerController));
router.get('/', authenticate, customerController.getCustomers.bind(customerController));
router.get('/:id', authenticate, customerController.getCustomerById.bind(customerController));
router.put('/:id', authenticate, validate(updateCustomerValidation), customerController.updateCustomer.bind(customerController));
router.delete('/:id', authenticate, customerController.deleteCustomer.bind(customerController));

export default router;

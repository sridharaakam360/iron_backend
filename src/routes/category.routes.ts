import { Router } from 'express';
import { body } from 'express-validator';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();
const categoryController = new CategoryController();

const createCategoryValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
];

const updateCategoryValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

router.post('/', authenticate, validate(createCategoryValidation), categoryController.createCategory.bind(categoryController));
router.get('/', authenticate, categoryController.getCategories.bind(categoryController));
router.get('/:id', authenticate, categoryController.getCategoryById.bind(categoryController));
router.put('/:id', authenticate, validate(updateCategoryValidation), categoryController.updateCategory.bind(categoryController));
router.delete('/:id', authenticate, categoryController.deleteCategory.bind(categoryController));

export default router;

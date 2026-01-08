import { Router } from 'express';
import { body } from 'express-validator';
import { ServiceTypeController } from '../controllers/serviceType.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();
const serviceTypeController = new ServiceTypeController();

const createServiceTypeValidation = [
    body('name').notEmpty().withMessage('Name is required'),
];

const updateServiceTypeValidation = [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

router.post('/', authenticate, validate(createServiceTypeValidation), serviceTypeController.createServiceType.bind(serviceTypeController));
router.get('/', authenticate, serviceTypeController.getServiceTypes.bind(serviceTypeController));
router.get('/:id', authenticate, serviceTypeController.getServiceTypeById.bind(serviceTypeController));
router.put('/:id', authenticate, validate(updateServiceTypeValidation), serviceTypeController.updateServiceType.bind(serviceTypeController));
router.delete('/:id', authenticate, serviceTypeController.deleteServiceType.bind(serviceTypeController));

export default router;

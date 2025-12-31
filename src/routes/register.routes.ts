import { Router } from 'express';
import { registerStore } from '../controllers/register.controller';

const router = Router();

// Simple, fast store registration
router.post('/register', registerStore);

export default router;

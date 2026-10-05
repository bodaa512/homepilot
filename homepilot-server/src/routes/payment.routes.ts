import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCheckoutSchema } from '../validators/payment.validators';

const router = Router();

router.get('/plans', PaymentController.listPlans);

router.use(requireAuth);
router.post('/checkout', validate(createCheckoutSchema), PaymentController.checkout);
router.get('/history', PaymentController.history);

export default router;

import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateSubscriptionSchema } from '../validators/subscription.validators';

const router = Router();

router.use(requireAuth);
router.put('/:subscriptionId', validate(updateSubscriptionSchema), SubscriptionController.update);
router.delete('/:subscriptionId', SubscriptionController.remove);

export default router;

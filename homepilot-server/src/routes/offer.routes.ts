import { Router } from 'express';
import { OfferController } from '../controllers/offer.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.patch('/:offerId/accept', OfferController.accept);

export default router;

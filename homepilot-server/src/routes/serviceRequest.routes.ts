import { Router } from 'express';
import { ServiceRequestController } from '../controllers/serviceRequest.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createOfferSchema, createReviewSchema } from '../validators/serviceRequest.validators';
import { sendMessageSchema } from '../validators/message.validators';

const router = Router();

router.use(requireAuth);

router.get('/:requestId', ServiceRequestController.getOne);
router.patch('/:requestId/cancel', ServiceRequestController.cancel);

router.get('/:requestId/offers', ServiceRequestController.listOffers);
router.post('/:requestId/offers', validate(createOfferSchema), ServiceRequestController.submitOffer);

router.post('/:requestId/review', validate(createReviewSchema), ServiceRequestController.createReview);

router.get('/:requestId/providers/:providerId/messages', ServiceRequestController.listMessages);
router.post(
  '/:requestId/providers/:providerId/messages',
  validate(sendMessageSchema),
  ServiceRequestController.sendMessage,
);

export default router;

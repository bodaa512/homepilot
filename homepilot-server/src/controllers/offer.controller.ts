import { OfferService } from '../services/offer.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

export const OfferController = {
  accept: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new AuthenticationError();
    const result = await OfferService.acceptOffer(req.user.id, req.params.offerId);
    sendSuccess(res, result, 'Offer accepted, appointment scheduled');
  }),
};

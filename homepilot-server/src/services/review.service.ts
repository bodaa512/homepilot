import { ProviderReview } from '../models/ProviderReview';
import { ServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest';
import { ServiceOffer, ServiceOfferStatus } from '../models/ServiceOffer';
import { Provider } from '../models/Provider';
import { NotFoundError, ValidationError, AuthorizationError } from '../errors/specificErrors';

export const ReviewService = {
  async createReview(
    userId: string,
    requestId: string,
    input: { ratingOverall: number } & Record<string, unknown>,
  ) {
    const request = await ServiceRequest.findById(requestId);
    if (!request) throw new NotFoundError('Service request not found');
    if (request.createdBy.toString() !== userId) {
      throw new AuthorizationError('Only the person who created this request can review it');
    }
    if (request.status !== ServiceRequestStatus.COMPLETED) {
      throw new ValidationError('This request has not been marked completed yet');
    }

    const acceptedOffer = await ServiceOffer.findOne({ serviceRequest: requestId, status: ServiceOfferStatus.ACCEPTED });
    if (!acceptedOffer) throw new ValidationError('No accepted offer found for this request');

    const review = await ProviderReview.create({
      ...input,
      provider: acceptedOffer.provider,
      serviceRequest: requestId,
      user: userId,
    });

    const provider = await Provider.findById(acceptedOffer.provider);
    if (provider) {
      const newCount = provider.ratingCount + 1;
      const newAverage = (provider.ratingAverage * provider.ratingCount + review.ratingOverall) / newCount;
      provider.ratingAverage = Math.round(newAverage * 10) / 10;
      provider.ratingCount = newCount;
      await provider.save();
    }

    request.status = ServiceRequestStatus.REVIEWED;
    request.statusHistory.push({ status: ServiceRequestStatus.REVIEWED, changedAt: new Date(), changedBy: userId as never });
    await request.save();

    return review;
  },

  async listForProvider(providerId: string) {
    return ProviderReview.find({ provider: providerId }).sort({ createdAt: -1 });
  },
};

import { ServiceRequestService } from '../services/serviceRequest.service';
import { OfferService } from '../services/offer.service';
import { ReviewService } from '../services/review.service';
import { ChatService } from '../services/chat.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const ServiceRequestController = {
  create: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const request = await ServiceRequestService.createRequest(requireUserId(req), req.params.homeId, req.body);
    sendSuccess(res, { request }, 'Service request created', 201);
  }),

  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const requests = await ServiceRequestService.listForHome(requireUserId(req), req.params.homeId);
    sendSuccess(res, { requests });
  }),

  getOne: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const request = await ServiceRequestService.getRequest(requireUserId(req), req.params.requestId);
    sendSuccess(res, { request });
  }),

  cancel: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const request = await ServiceRequestService.cancelRequest(requireUserId(req), req.params.requestId);
    sendSuccess(res, { request }, 'Service request cancelled');
  }),

  listOffers: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const offers = await OfferService.listOffersForRequest(requireUserId(req), req.params.requestId);
    sendSuccess(res, { offers });
  }),

  submitOffer: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const offer = await OfferService.submitOffer(requireUserId(req), req.params.requestId, req.body);
    sendSuccess(res, { offer }, 'Offer submitted', 201);
  }),

  createReview: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const review = await ReviewService.createReview(requireUserId(req), req.params.requestId, req.body);
    sendSuccess(res, { review }, 'Review submitted', 201);
  }),

  listMessages: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const messages = await ChatService.listMessages(requireUserId(req), req.params.requestId, req.params.providerId);
    sendSuccess(res, { messages });
  }),

  sendMessage: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const message = await ChatService.sendMessage(
      requireUserId(req),
      req.params.requestId,
      req.params.providerId,
      req.body.text,
    );
    sendSuccess(res, { message }, 'Message sent', 201);
  }),
};

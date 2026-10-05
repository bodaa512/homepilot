import { SubscriptionService } from '../services/subscription.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const SubscriptionController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await SubscriptionService.listSubscriptions(requireUserId(req), req.params.homeId);
    sendSuccess(res, result);
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const subscription = await SubscriptionService.createSubscription(requireUserId(req), req.params.homeId, req.body);
    sendSuccess(res, { subscription }, 'Subscription added', 201);
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const subscription = await SubscriptionService.updateSubscription(
      requireUserId(req),
      req.params.subscriptionId,
      req.body,
    );
    sendSuccess(res, { subscription }, 'Subscription updated');
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await SubscriptionService.deleteSubscription(requireUserId(req), req.params.subscriptionId);
    sendSuccess(res, null, 'Subscription removed');
  }),
};

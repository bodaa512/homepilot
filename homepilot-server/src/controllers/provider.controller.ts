import { ProviderService } from '../services/provider.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const ProviderController = {
  upsertOwnProfile: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const provider = await ProviderService.upsertOwnProfile(requireUserId(req), req.body);
    sendSuccess(res, { provider }, 'Provider profile saved');
  }),

  getOwnProfile: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const provider = await ProviderService.getOwnProfile(requireUserId(req));
    sendSuccess(res, { provider });
  }),

  listOpenRequests: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const requests = await ProviderService.listOpenRequestsForProvider(requireUserId(req));
    sendSuccess(res, { requests });
  }),
};

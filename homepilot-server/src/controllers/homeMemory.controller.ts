import { HomeMemoryService } from '../services/homeMemory.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

export const HomeMemoryController = {
  getMemory: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new AuthenticationError();
    const entries = await HomeMemoryService.getMemory(req.user.id, req.params.homeId);
    sendSuccess(res, { entries });
  }),
};

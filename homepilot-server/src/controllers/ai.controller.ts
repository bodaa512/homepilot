import { AIAssistantService } from '../services/aiAssistant.service';
import { RepairVsReplaceService } from '../services/repairVsReplace.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const AIController = {
  chat: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const message = await AIAssistantService.chat(requireUserId(req), req.body.homeId, req.body.message);
    sendSuccess(res, { message });
  }),

  history: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const messages = await AIAssistantService.getHistory(requireUserId(req), req.params.homeId);
    sendSuccess(res, { messages });
  }),

  repairVsReplace: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = RepairVsReplaceService.calculate(req.body);
    sendSuccess(res, result);
  }),
};

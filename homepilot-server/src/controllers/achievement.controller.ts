import { AchievementService } from '../services/achievement.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

export const AchievementController = {
  listMine: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new AuthenticationError();
    const achievements = await AchievementService.listForUser(req.user.id);
    sendSuccess(res, { achievements });
  }),
};

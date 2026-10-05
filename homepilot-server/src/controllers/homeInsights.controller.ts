import { HomeHealthScoreService } from '../services/homeHealthScore.service';
import { WeeklyReportService } from '../services/weeklyReport.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const HomeInsightsController = {
  healthScore: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const score = await HomeHealthScoreService.calculate(requireUserId(req), req.params.homeId);
    sendSuccess(res, score);
  }),

  weeklyReport: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const report = await WeeklyReportService.generate(requireUserId(req), req.params.homeId);
    sendSuccess(res, report);
  }),
};

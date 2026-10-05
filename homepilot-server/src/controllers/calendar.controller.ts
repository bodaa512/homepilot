import { CalendarService } from '../services/calendar.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

export const CalendarController = {
  getEvents: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new AuthenticationError();

    const now = new Date();
    const from = req.query.from ? new Date(req.query.from as string) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = req.query.to ? new Date(req.query.to as string) : new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const events = await CalendarService.getEvents(req.user.id, req.params.homeId, from, to);
    sendSuccess(res, { events });
  }),
};

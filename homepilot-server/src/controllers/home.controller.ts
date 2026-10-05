import { HomeService } from '../services/home.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const HomeController = {
  create: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const home = await HomeService.createHome(requireUserId(req), req.body);
    sendSuccess(res, { home }, 'Home created successfully', 201);
  }),

  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const homes = await HomeService.listMyHomes(requireUserId(req));
    sendSuccess(res, { homes });
  }),

  getOne: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const home = await HomeService.getHome(requireUserId(req), req.params.homeId);
    sendSuccess(res, { home });
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const home = await HomeService.updateHome(requireUserId(req), req.params.homeId, req.body);
    sendSuccess(res, { home }, 'Home updated successfully');
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await HomeService.deleteHome(requireUserId(req), req.params.homeId);
    sendSuccess(res, null, 'Home deleted successfully');
  }),

  listMembers: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const members = await HomeService.listMembers(requireUserId(req), req.params.homeId);
    sendSuccess(res, { members });
  }),

  inviteMember: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const membership = await HomeService.inviteMember(
      requireUserId(req),
      req.params.homeId,
      req.body.email,
      req.body.role,
    );
    sendSuccess(res, { membership }, 'Member added successfully', 201);
  }),

  summary: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const summary = await HomeService.getHomeSummary(requireUserId(req), req.params.homeId);
    sendSuccess(res, summary);
  }),
};

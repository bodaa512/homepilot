import { AdminService } from '../services/admin.service';
import { AuditLogService } from '../services/auditLog.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const AdminController = {
  listUsers: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { search, page, limit } = req.query;
    const result = await AdminService.listUsers({
      search: typeof search === 'string' ? search : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    sendSuccess(res, result);
  }),

  setUserActive: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await AdminService.setUserActive(requireUserId(req), req.params.userId, req.body.isActive);
    sendSuccess(res, { user }, 'User updated');
  }),

  listProviders: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const providers = await AdminService.listProviders({ status: status as never });
    sendSuccess(res, { providers });
  }),

  setProviderVerification: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const provider = await AdminService.setProviderVerification(
      requireUserId(req),
      req.params.providerId,
      req.body.status,
    );
    sendSuccess(res, { provider }, 'Provider verification updated');
  }),

  analytics: asyncHandler(async (_req, res) => {
    const analytics = await AdminService.getPlatformAnalytics();
    sendSuccess(res, analytics);
  }),

  auditLogs: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entityType, limit } = req.query;
    const logs = await AuditLogService.list({
      entityType: typeof entityType === 'string' ? entityType : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    sendSuccess(res, { logs });
  }),
};

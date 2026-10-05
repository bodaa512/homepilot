import { AssetService } from '../services/asset.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const AssetController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const room = typeof req.query.room === 'string' ? req.query.room : undefined;
    const assets = await AssetService.listAssets(requireUserId(req), req.params.homeId, { room });
    sendSuccess(res, { assets });
  }),

  getOne: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asset = await AssetService.getAsset(requireUserId(req), req.params.assetId);
    sendSuccess(res, { asset });
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asset = await AssetService.createAsset(requireUserId(req), req.params.homeId, req.body);
    sendSuccess(res, { asset }, 'Asset added successfully', 201);
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asset = await AssetService.updateAsset(requireUserId(req), req.params.assetId, req.body);
    sendSuccess(res, { asset }, 'Asset updated successfully');
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await AssetService.deleteAsset(requireUserId(req), req.params.assetId);
    sendSuccess(res, null, 'Asset deleted successfully');
  }),
};

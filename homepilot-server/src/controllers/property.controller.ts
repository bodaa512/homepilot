import { PropertyService } from '../services/property.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const PropertyController = {
  create: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const property = await PropertyService.createProperty(requireUserId(req), req.body);
    sendSuccess(res, { property }, 'Property created', 201);
  }),

  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const properties = await PropertyService.listMyProperties(requireUserId(req));
    sendSuccess(res, { properties });
  }),

  listUnits: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const units = await PropertyService.listUnits(requireUserId(req), req.params.propertyId);
    sendSuccess(res, { units });
  }),

  addUnit: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const unit = await PropertyService.addUnit(requireUserId(req), req.params.propertyId, req.body.unitNumber);
    sendSuccess(res, { unit }, 'Unit added', 201);
  }),

  assignTenant: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenant = await PropertyService.assignTenant(requireUserId(req), req.params.unitId, req.body);
    sendSuccess(res, { tenant }, 'Tenant assigned', 201);
  }),
};

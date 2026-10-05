import { ServiceRequest, IServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest';
import { Provider } from '../models/Provider';
import { ServiceOffer } from '../models/ServiceOffer';
import { NotFoundError, AuthorizationError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';
import { homeRoleHasPermission, HomeRole } from '../constants/roles';

export const ServiceRequestService = {
  async createRequest(
    userId: string,
    homeId: string,
    input: Pick<IServiceRequest, 'category' | 'title'> & Partial<IServiceRequest>,
  ) {
    const membership = await assertHomeAccess(userId, homeId);
    const canCreate =
      homeRoleHasPermission(membership.role as HomeRole, 'service-requests:manage') ||
      homeRoleHasPermission(membership.role as HomeRole, 'service-requests:create');
    if (!canCreate) throw new AuthorizationError('Missing permission: service-requests:create');

    return ServiceRequest.create({
      ...input,
      home: homeId,
      createdBy: userId,
      statusHistory: [{ status: ServiceRequestStatus.REQUESTED, changedAt: new Date(), changedBy: userId }],
    });
  },

  async listForHome(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);
    return ServiceRequest.find({ home: homeId }).sort({ createdAt: -1 });
  },

  /** A request is visible to home members, and separately to any provider who has an offer on it. */
  async getRequest(userId: string, requestId: string) {
    const request = await ServiceRequest.findById(requestId).populate('asset', 'name').populate('room', 'name');
    if (!request) throw new NotFoundError('Service request not found');

    const isHomeMember = await assertHomeAccess(userId, request.home.toString()).then(
      () => true,
      () => false,
    );
    if (isHomeMember) return request;

    const provider = await Provider.findOne({ user: userId });
    const hasOffer = provider
      ? await ServiceOffer.exists({ serviceRequest: requestId, provider: provider._id })
      : null;
    if (!hasOffer) throw new NotFoundError('Service request not found');

    return request;
  },

  async cancelRequest(userId: string, requestId: string) {
    const request = await ServiceRequest.findById(requestId);
    if (!request) throw new NotFoundError('Service request not found');
    await assertHomeAccess(userId, request.home.toString(), 'service-requests:manage');

    request.status = ServiceRequestStatus.CANCELLED;
    request.statusHistory.push({ status: ServiceRequestStatus.CANCELLED, changedAt: new Date(), changedBy: userId as never });
    await request.save();
    return request;
  },
};

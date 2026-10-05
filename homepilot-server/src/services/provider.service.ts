import { Provider, IProvider } from '../models/Provider';
import { ServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest';
import { NotFoundError } from '../errors/specificErrors';

const OPEN_STATUSES = [
  ServiceRequestStatus.REQUESTED,
  ServiceRequestStatus.REVIEWING,
  ServiceRequestStatus.OFFERS_RECEIVED,
];

export const ProviderService = {
  async upsertOwnProfile(
    userId: string,
    input: Pick<IProvider, 'businessName' | 'categories' | 'serviceAreas'> & Partial<IProvider>,
  ) {
    return Provider.findOneAndUpdate(
      { user: userId },
      { ...input, user: userId },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  },

  async getOwnProfile(userId: string) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) throw new NotFoundError('You have not created a provider profile yet');
    return provider;
  },

  /**
   * Requests currently open for new offers, matching this provider's
   * declared categories. Home address is intentionally not populated here —
   * providers see only what they need to decide whether to bid.
   */
  async listOpenRequestsForProvider(userId: string) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) throw new NotFoundError('You have not created a provider profile yet');

    return ServiceRequest.find({
      status: { $in: OPEN_STATUSES },
      category: { $in: provider.categories },
    })
      .populate('home', 'name city')
      .sort({ createdAt: -1 });
  },
};

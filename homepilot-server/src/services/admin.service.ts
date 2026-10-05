import { User } from '../models/User';
import { Home } from '../models/Home';
import { Provider, ProviderVerificationStatus } from '../models/Provider';
import { ServiceRequest } from '../models/ServiceRequest';
import { Payment } from '../models/Payment';
import { AuditLogService } from './auditLog.service';
import { NotFoundError } from '../errors/specificErrors';

export const AdminService = {
  async listUsers(filters: { search?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const query: Record<string, unknown> = {};
    if (filters.search) {
      query['$or'] = [
        { fullName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('fullName email role isActive isEmailVerified planCode createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return { users, total, page, limit };
  },

  async setUserActive(adminId: string, userId: string, isActive: boolean) {
    const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true });
    if (!user) throw new NotFoundError('User not found');

    await AuditLogService.log({
      actor: adminId,
      action: isActive ? 'user.reactivate' : 'user.deactivate',
      entityType: 'User',
      entityId: userId,
    });

    return user;
  },

  async listProviders(filters: { status?: ProviderVerificationStatus }) {
    const query: Record<string, unknown> = {};
    if (filters.status) query['verificationStatus'] = filters.status;
    return Provider.find(query).populate('user', 'fullName email').sort({ createdAt: -1 });
  },

  async setProviderVerification(adminId: string, providerId: string, status: ProviderVerificationStatus) {
    const provider = await Provider.findByIdAndUpdate(providerId, { verificationStatus: status }, { new: true });
    if (!provider) throw new NotFoundError('Provider not found');

    await AuditLogService.log({
      actor: adminId,
      action: 'provider.verification.update',
      entityType: 'Provider',
      entityId: providerId,
      metadata: { status },
    });

    return provider;
  },

  async getPlatformAnalytics() {
    const [totalUsers, activeUsers, totalHomes, totalProviders, verifiedProviders, openServiceRequests, revenueAgg] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ isActive: true }),
        Home.countDocuments({ isActive: true }),
        Provider.countDocuments({}),
        Provider.countDocuments({ verificationStatus: ProviderVerificationStatus.VERIFIED }),
        ServiceRequest.countDocuments({ status: { $nin: ['COMPLETED', 'REVIEWED', 'CANCELLED'] } }),
        Payment.aggregate([{ $match: { status: 'succeeded' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      ]);

    const usersByPlan = await User.aggregate([{ $group: { _id: '$planCode', count: { $sum: 1 } } }]);

    return {
      totalUsers,
      activeUsers,
      totalHomes,
      totalProviders,
      verifiedProviders,
      openServiceRequests,
      totalRevenue: revenueAgg[0]?.total ?? 0,
      usersByPlan: usersByPlan.map((p) => ({ plan: p._id, count: p.count })),
    };
  },
};

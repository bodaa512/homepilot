import { Subscription, ISubscription, BillingFrequency } from '../models/Subscription';
import { NotFoundError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';

function annualizedCost(sub: Pick<ISubscription, 'price' | 'billingFrequency'>): number {
  return sub.billingFrequency === BillingFrequency.MONTHLY ? sub.price * 12 : sub.price;
}

export const SubscriptionService = {
  async listSubscriptions(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);
    const subscriptions = await Subscription.find({ home: homeId }).sort({ nextBillingDate: 1 });
    const totalAnnualCost = subscriptions
      .filter((s) => s.isActive)
      .reduce((sum, s) => sum + annualizedCost(s), 0);
    return { subscriptions, totalAnnualCost };
  },

  async createSubscription(
    userId: string,
    homeId: string,
    input: Pick<ISubscription, 'name' | 'price' | 'nextBillingDate'> & Partial<ISubscription>,
  ) {
    await assertHomeAccess(userId, homeId, 'expenses:manage');
    return Subscription.create({ ...input, home: homeId, createdBy: userId });
  },

  async updateSubscription(userId: string, subscriptionId: string, updates: Partial<ISubscription>) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) throw new NotFoundError('Subscription not found');
    await assertHomeAccess(userId, subscription.home.toString(), 'expenses:manage');
    Object.assign(subscription, updates);
    await subscription.save();
    return subscription;
  },

  async deleteSubscription(userId: string, subscriptionId: string) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) throw new NotFoundError('Subscription not found');
    await assertHomeAccess(userId, subscription.home.toString(), 'expenses:manage');
    await subscription.deleteOne();
  },
};

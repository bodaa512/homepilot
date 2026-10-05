export type BillingFrequency = 'monthly' | 'yearly';

export interface Subscription {
  _id: string;
  home: string;
  name: string;
  category?: string;
  price: number;
  currency: string;
  billingFrequency: BillingFrequency;
  nextBillingDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSubscriptionPayload {
  name: string;
  category?: string;
  price: number;
  billingFrequency: BillingFrequency;
  nextBillingDate: string;
}

/** رد GET /homes/:homeId/subscriptions (services/subscription.service.ts في السيرفر). */
export interface SubscriptionListResponse {
  subscriptions: Subscription[];
  totalAnnualCost: number;
}

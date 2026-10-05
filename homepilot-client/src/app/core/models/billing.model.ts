/** يطابق IPlan في السيرفر (models/Plan.ts). */
export type PlanCode = 'free' | 'premium' | 'property_pro';

export interface Plan {
  _id: string;
  code: PlanCode;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: { homes: number; aiRequestsPerMonth: number };
}

/** يطابق IPayment في السيرفر (models/Payment.ts) — plan بييجي populate بالاسم والكود بس. */
export interface PaymentRecord {
  _id: string;
  plan: { _id: string; name: string; code: PlanCode } | null;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  createdAt: string;
}

export interface CheckoutResult {
  url: string;
}

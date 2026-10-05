import { Plan } from '../models/Plan';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { getStripe } from '../config/stripe';
import { env } from '../config/env';
import { NotFoundError, PaymentError } from '../errors/specificErrors';
import Stripe from 'stripe';

export const PaymentService = {
  async listPlans() {
    return Plan.find({}).sort({ priceMonthly: 1 });
  },

  async createCheckoutSession(userId: string, planCode: string) {
    const plan = await Plan.findOne({ code: planCode });
    if (!plan) throw new NotFoundError('Plan not found');
    if (plan.priceMonthly === 0) {
      throw new PaymentError('The Free plan does not require checkout');
    }

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `HomePilot ${plan.name}` },
            unit_amount: Math.round(plan.priceMonthly * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.clientUrl}/app/settings/billing?status=success`,
      cancel_url: `${env.clientUrl}/app/settings/billing?status=cancelled`,
      metadata: { userId, planCode: plan.code },
    });

    await Payment.create({
      user: userId,
      plan: plan._id,
      amount: plan.priceMonthly,
      currency: 'usd',
      stripeSessionId: session.id,
      status: 'pending',
    });

    return { url: session.url };
  },

  /** Verifies the Stripe signature so this can only ever be triggered by Stripe itself. */
  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!env.stripe.webhookSecret) {
      throw new PaymentError('Stripe webhook secret is not configured');
    }

    const stripe = getStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
    } catch {
      throw new PaymentError('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const payment = await Payment.findOne({ stripeSessionId: session.id });
      if (payment) {
        payment.status = 'succeeded';
        payment.stripePaymentIntentId =
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
        await payment.save();

        const plan = await Plan.findById(payment.plan);
        if (plan) {
          await User.findByIdAndUpdate(payment.user, {
            planCode: plan.code,
            planRenewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        }
      }
    }

    return { received: true };
  },

  async listHistory(userId: string) {
    return Payment.find({ user: userId }).populate('plan', 'name code').sort({ createdAt: -1 });
  },
};

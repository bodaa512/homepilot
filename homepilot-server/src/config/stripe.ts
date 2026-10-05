import Stripe from 'stripe';
import { env } from '../config/env';
import { PaymentError } from '../errors/specificErrors';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.stripe.secretKey) {
    throw new PaymentError('Payments are not configured yet — set STRIPE_SECRET_KEY in the environment');
  }
  if (!stripe) {
    stripe = new Stripe(env.stripe.secretKey);
  }
  return stripe;
}

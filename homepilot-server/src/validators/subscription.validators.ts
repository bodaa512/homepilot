import { z } from 'zod';
import { BillingFrequency } from '../models/Subscription';

export const createSubscriptionSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    category: z.string().max(60).optional(),
    price: z.number().positive(),
    currency: z.string().max(6).optional(),
    billingFrequency: z.nativeEnum(BillingFrequency).optional(),
    nextBillingDate: z.coerce.date(),
  }),
  params: z.object({ homeId: z.string().min(1) }),
});

export const updateSubscriptionSchema = z.object({
  body: createSubscriptionSchema.shape.body.partial().extend({ isActive: z.boolean().optional() }),
  params: z.object({ subscriptionId: z.string().min(1) }),
});

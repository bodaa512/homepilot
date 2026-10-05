import { z } from 'zod';

export const createCheckoutSchema = z.object({
  body: z.object({
    planCode: z.enum(['premium', 'property_pro']),
  }),
});

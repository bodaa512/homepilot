import { z } from 'zod';
import { ServiceCategory } from '../models/Provider';

export const createProviderSchema = z.object({
  body: z.object({
    businessName: z.string().min(1).max(120),
    categories: z.array(z.nativeEnum(ServiceCategory)).min(1),
    serviceAreas: z.array(z.string().min(1)).min(1),
    bio: z.string().max(1000).optional(),
  }),
});

export const updateProviderSchema = z.object({
  body: createProviderSchema.shape.body.partial(),
});

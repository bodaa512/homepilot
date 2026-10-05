import { z } from 'zod';
import { ProviderVerificationStatus } from '../models/Provider';

export const setUserActiveSchema = z.object({
  body: z.object({ isActive: z.boolean() }),
  params: z.object({ userId: z.string().min(1) }),
});

export const setProviderVerificationSchema = z.object({
  body: z.object({ status: z.nativeEnum(ProviderVerificationStatus) }),
  params: z.object({ providerId: z.string().min(1) }),
});

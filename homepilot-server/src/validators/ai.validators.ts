import { z } from 'zod';

export const aiChatSchema = z.object({
  body: z.object({
    homeId: z.string().min(1),
    message: z.string().min(1).max(2000),
  }),
});

export const repairVsReplaceSchema = z.object({
  body: z.object({
    originalPrice: z.number().min(0),
    currentAgeYears: z.number().min(0),
    expectedLifespanYears: z.number().min(0.1),
    repairCost: z.number().min(0),
    previousRepairsCost: z.number().min(0),
    replacementCost: z.number().min(0),
  }),
});

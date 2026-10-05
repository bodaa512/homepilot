import { z } from 'zod';

export const sendMessageSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(4000),
  }),
  params: z.object({ requestId: z.string().min(1) }),
});

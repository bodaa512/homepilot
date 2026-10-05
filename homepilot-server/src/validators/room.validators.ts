import { z } from 'zod';

export const createRoomSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80),
    type: z.string().max(40).optional(),
    notes: z.string().max(1000).optional(),
  }),
  params: z.object({ homeId: z.string().min(1) }),
});

export const updateRoomSchema = z.object({
  body: createRoomSchema.shape.body.partial(),
  params: z.object({ roomId: z.string().min(1) }),
});

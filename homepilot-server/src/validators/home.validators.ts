import { z } from 'zod';
import { HomeType, OwnershipType } from '../models/Home';

export const createHomeSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    type: z.nativeEnum(HomeType),
    address: z.string().max(200).optional(),
    city: z.string().max(80).optional(),
    country: z.string().max(80).optional(),
    ownershipType: z.nativeEnum(OwnershipType).optional(),
    numberOfRooms: z.number().int().min(0).optional(),
    numberOfResidents: z.number().int().min(0).optional(),
    notes: z.string().max(2000).optional(),
  }),
});

export const updateHomeSchema = z.object({
  body: createHomeSchema.shape.body.partial(),
  params: z.object({ homeId: z.string().min(1) }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
  }),
  params: z.object({ homeId: z.string().min(1) }),
});

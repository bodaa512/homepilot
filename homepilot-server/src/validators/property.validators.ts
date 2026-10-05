import { z } from 'zod';

export const createPropertySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150),
    address: z.string().max(200).optional(),
    city: z.string().max(80).optional(),
  }),
});

export const addUnitSchema = z.object({
  body: z.object({ unitNumber: z.string().min(1).max(30) }),
  params: z.object({ propertyId: z.string().min(1) }),
});

export const assignTenantSchema = z.object({
  body: z.object({
    email: z.string().email(),
    leaseStart: z.coerce.date().optional(),
    leaseEnd: z.coerce.date().optional(),
    rentAmount: z.number().min(0).optional(),
  }),
  params: z.object({ unitId: z.string().min(1) }),
});

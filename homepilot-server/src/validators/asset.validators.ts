import { z } from 'zod';
import { AssetCategory, AssetCondition } from '../models/Asset';

export const createAssetSchema = z.object({
  body: z.object({
    room: z.string().min(1).optional(),
    category: z.nativeEnum(AssetCategory),
    name: z.string().min(1).max(120),
    brand: z.string().max(80).optional(),
    modelName: z.string().max(80).optional(),
    serialNumber: z.string().max(120).optional(),
    purchaseDate: z.coerce.date().optional(),
    purchasePrice: z.number().min(0).optional(),
    currency: z.string().max(6).optional(),
    warrantyStart: z.coerce.date().optional(),
    warrantyExpiration: z.coerce.date().optional(),
    expectedLifespanMonths: z.number().int().min(0).optional(),
    condition: z.nativeEnum(AssetCondition).optional(),
    notes: z.string().max(2000).optional(),
  }),
  params: z.object({ homeId: z.string().min(1) }),
});

export const updateAssetSchema = z.object({
  body: createAssetSchema.shape.body.partial(),
  params: z.object({ assetId: z.string().min(1) }),
});

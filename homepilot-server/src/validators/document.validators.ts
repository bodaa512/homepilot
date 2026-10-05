import { z } from 'zod';
import { DocumentType } from '../models/Document';

export const uploadDocumentMetaSchema = z.object({
  body: z.object({
    type: z.nativeEnum(DocumentType).optional(),
    asset: z.string().min(1).optional(),
    expirationDate: z.coerce.date().optional(),
  }),
  params: z.object({ homeId: z.string().min(1) }),
});

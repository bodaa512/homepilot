import { z } from 'zod';
import { ServiceCategory } from '../models/Provider';
import { ServiceRequestUrgency } from '../models/ServiceRequest';

export const createServiceRequestSchema = z.object({
  body: z.object({
    category: z.nativeEnum(ServiceCategory),
    title: z.string().min(1).max(150),
    description: z.string().max(2000).optional(),
    urgency: z.nativeEnum(ServiceRequestUrgency).optional(),
    location: z.string().max(200).optional(),
    preferredDate: z.coerce.date().optional(),
    estimatedBudget: z.number().min(0).optional(),
    asset: z.string().min(1).optional(),
    room: z.string().min(1).optional(),
  }),
  params: z.object({ homeId: z.string().min(1) }),
});

export const createOfferSchema = z.object({
  body: z.object({
    price: z.number().positive(),
    currency: z.string().max(6).optional(),
    estimatedDurationHours: z.number().min(0).optional(),
    proposedDate: z.coerce.date().optional(),
    message: z.string().max(1000).optional(),
    warrantyPeriodDays: z.number().min(0).optional(),
  }),
  params: z.object({ requestId: z.string().min(1) }),
});

export const createReviewSchema = z.object({
  body: z.object({
    ratingOverall: z.number().int().min(1).max(5),
    ratingProfessionalism: z.number().int().min(1).max(5).optional(),
    ratingPunctuality: z.number().int().min(1).max(5).optional(),
    ratingQuality: z.number().int().min(1).max(5).optional(),
    ratingCommunication: z.number().int().min(1).max(5).optional(),
    ratingValue: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(1000).optional(),
  }),
  params: z.object({ requestId: z.string().min(1) }),
});

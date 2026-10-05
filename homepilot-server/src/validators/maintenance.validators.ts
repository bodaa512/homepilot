import { z } from 'zod';
import { MaintenanceTaskType } from '../models/MaintenanceTask';

export const createMaintenanceTaskSchema = z.object({
  body: z.object({
    asset: z.string().min(1).optional(),
    title: z.string().min(1).max(150),
    description: z.string().max(2000).optional(),
    type: z.nativeEnum(MaintenanceTaskType).optional(),
    recurrenceIntervalDays: z.number().int().min(1).optional(),
    dueDate: z.coerce.date(),
  }),
  params: z.object({ homeId: z.string().min(1) }),
});

export const updateMaintenanceTaskSchema = z.object({
  body: createMaintenanceTaskSchema.shape.body.partial(),
  params: z.object({ taskId: z.string().min(1) }),
});

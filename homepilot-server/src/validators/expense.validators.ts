import { z } from 'zod';
import { ExpenseCategory } from '../models/Expense';

export const createExpenseSchema = z.object({
  body: z.object({
    asset: z.string().min(1).optional(),
    amount: z.number().positive(),
    currency: z.string().max(6).optional(),
    category: z.nativeEnum(ExpenseCategory),
    date: z.coerce.date(),
    paymentMethod: z.string().max(60).optional(),
    description: z.string().max(500).optional(),
  }),
  params: z.object({ homeId: z.string().min(1) }),
});

export const updateExpenseSchema = z.object({
  body: createExpenseSchema.shape.body.partial(),
  params: z.object({ expenseId: z.string().min(1) }),
});

import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    password: passwordRule,
    role: z.enum(['owner', 'renter', 'provider', 'property_manager']).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: passwordRule,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordRule,
  }),
});

// Phone numbers are free-form (Egyptian mobiles, landlines, international) —
// we only block characters that can't appear in one, and cap the length.
const phoneRule = z
  .string()
  .trim()
  .max(30, 'Phone number is too long')
  .regex(/^[0-9+()\-\s]*$/, 'Phone number contains invalid characters');

/**
 * Self-service profile edit. Only these two fields can ever be changed here —
 * email, role, plan, etc. are deliberately not editable (the service also picks
 * them explicitly, so extra keys in the body are ignored). An empty-string
 * `phone` clears the stored number.
 */
export const updateProfileSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(120).optional(),
      phone: phoneRule.optional(),
    })
    .refine((body) => body.fullName !== undefined || body.phone !== undefined, {
      message: 'Provide fullName and/or phone to update',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];

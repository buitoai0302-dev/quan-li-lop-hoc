import { z } from 'zod';

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(1).max(100),
    tenantName: z.string().trim().min(1).max(100).optional(),
    intendedPlanCode: z.string().trim().min(1).max(40).optional(),
    billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  }),
});

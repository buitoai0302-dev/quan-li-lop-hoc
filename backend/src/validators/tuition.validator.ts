import { z } from 'zod';

export const CreateTuitionSchema = z.object({
  body: z.object({
    student_id: z.string().uuid(),
    class_id: z.string().uuid().optional(),
    amount: z.number().positive(),
    discount: z.number().min(0).default(0),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    billing_cycle: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
    billing_period: z.string().optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const RecordPaymentSchema = z.object({
  body: z.object({
    amount_paid: z.number().positive(),
    payment_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    payment_method: z.enum(['cash', 'bank_transfer', 'momo', 'vnpay']).default('cash'),
    reference_code: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  }),
});

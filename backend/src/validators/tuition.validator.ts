import { z } from 'zod';
import { PAYMENT_METHODS, TUITION_STATUS } from '../utils/constants';

const MAX_TUITION_AMOUNT_VND = 9_999_999_999_999.99;
const tuitionAmount = z
  .union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/)])
  .refine((amount) => Number(amount) >= 0 && Number(amount) <= MAX_TUITION_AMOUNT_VND);

export const UpdateTuitionSchema = z.object({
  body: z.object({
    amount: tuitionAmount.nullish(),
    discount: tuitionAmount.nullish(),
    due_date: z.iso.date().nullish(),
    status: z.enum(TUITION_STATUS).nullish(),
    notes: z.string().max(500).nullish(),
  }),
});

export type UpdateTuitionDto = z.infer<typeof UpdateTuitionSchema>['body'];

const createTuitionBodySchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid().optional(),
  amount: z.number().positive().max(MAX_TUITION_AMOUNT_VND),
  discount: z.number().min(0).max(MAX_TUITION_AMOUNT_VND).default(0),
  due_date: z.iso.date(),
  billing_cycle: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  billing_period: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const CreateTuitionSchema = z.object({
  body: createTuitionBodySchema.refine((data) => data.discount <= data.amount),
});

export const BulkGenerateTuitionSchema = z.object({
  body: createTuitionBodySchema
    .omit({ student_id: true })
    .extend({
      class_id: z.string().uuid(),
      billing_period: z.string().trim().min(1).max(100),
      skip_existing: z.boolean().optional(),
    })
    .refine((data) => data.discount <= data.amount),
});

export const RecordPaymentSchema = z.object({
  body: z.object({
    amount_paid: z.number().positive().max(MAX_TUITION_AMOUNT_VND),
    payment_date: z.iso.date().optional(),
    payment_method: z.enum(PAYMENT_METHODS).default(PAYMENT_METHODS.CASH),
    reference_code: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  }),
});

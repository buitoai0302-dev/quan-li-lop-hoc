import { z } from 'zod';

export const MAX_IMPORT_ROWS = 500;
export const DEFAULT_IMPORT_CAPACITY = 30;
const EXCEL_DAY_MS = 86_400_000;
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

function normalizeImportDate(value: unknown): unknown {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number' && Number.isInteger(value) && value > 60 && value < 2_958_466) {
    return new Date(EXCEL_EPOCH_MS + value * EXCEL_DAY_MS).toISOString().slice(0, 10);
  }
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  return date ? `${date[3]}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}` : trimmed;
}

export const importDateSchema = z.preprocess(normalizeImportDate, z.iso.date().optional());
const optionalText = z.string().trim().max(500).nullish();
const importStudentSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  phone: optionalText,
  parent_phone: optionalText,
  date_of_birth: importDateSchema,
  class_name: z.string().trim().max(200).nullish(),
});

export const bulkStudentImportSchema = z.object({
  branch_id: z.string().uuid(),
  students: z.array(importStudentSchema).min(1).max(MAX_IMPORT_ROWS),
});

export const importPersonSchema = importStudentSchema.omit({ class_name: true }).extend({
  branch_id: z.string().uuid(),
  specialization: optionalText,
});

const capacitySchema = z.preprocess(
  (value) => (value == null || value === '' ? DEFAULT_IMPORT_CAPACITY : value),
  z.coerce.number().int().positive().max(100_000)
);

export const importRoomSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  capacity: capacitySchema,
  room_type: z.preprocess((value) => value || 'classroom', z.string().trim().max(50)),
});

export const importClassSchema = z
  .object({
    branch_id: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    teacher_email: z.string().trim().email(),
    max_capacity: capacitySchema,
    start_date: importDateSchema,
    end_date: importDateSchema,
  })
  .refine((row) => !row.start_date || !row.end_date || row.end_date >= row.start_date);

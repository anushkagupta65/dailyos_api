import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';
import { dateStringSchema, timezoneSchema } from '../commitments/commitments.validation';

export { idParamSchema };

export const MAX_PRIORITIES_PER_DAY = 3;

export const createPrioritySchema = z.object({
  priorityDate: dateStringSchema.optional(),
  title: z.string().trim().min(1, 'Title is required').max(250),
  description: z.string().max(2000).nullable().optional(),
});

export const updatePrioritySchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(250).optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .refine(
    (obj) => Object.values(obj).some((value) => value !== undefined),
    'At least one field must be provided'
  );

export const priorityCompletionSchema = z.object({
  isCompleted: z.boolean(),
});

export const reorderPrioritiesSchema = z.object({
  priorityDate: dateStringSchema,
  priorityIds: z
    .array(z.string().uuid('Invalid priority ID'))
    .min(1)
    .max(MAX_PRIORITIES_PER_DAY)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate priority IDs are not allowed'),
});

export const prioritiesQuerySchema = paginationQuerySchema
  .extend({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    date: dateStringSchema.optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    isCompleted: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: 'startDate must be on or before endDate',
    path: ['endDate'],
  });

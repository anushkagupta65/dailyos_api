import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';
import { dateStringSchema, timezoneSchema } from '../commitments/commitments.validation';

export { idParamSchema };

export const createIntentionSchema = z.object({
  intentionDate: dateStringSchema.optional(),
  content: z.string().trim().min(1, 'Content is required').max(5000),
});

export const updateIntentionSchema = z.object({
  content: z.string().trim().min(1, 'Content is required').max(5000),
});

export const intentionsQuerySchema = paginationQuerySchema
  .extend({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    date: dateStringSchema.optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: 'startDate must be on or before endDate',
    path: ['endDate'],
  });

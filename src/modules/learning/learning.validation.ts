import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';
import { dateStringSchema, timezoneSchema } from '../commitments/commitments.validation';

export { idParamSchema };

const atLeastOneField = (obj: Record<string, unknown>) =>
  Object.values(obj).some((value) => value !== undefined);
const atLeastOneFieldMessage = 'At least one field must be provided';

const isOrderedRange = (from?: string, to?: string) => !from || !to || from <= to;

// ---------------- ENTRIES ----------------
const learningFields = {
  title: z.string().trim().min(1, 'Title is required').max(250),
  content: z.string().max(50000).nullable().optional(),
  keyTakeaway: z.string().max(5000).nullable().optional(),
  category: z.string().trim().max(100).nullable().optional(),
  source: z.string().trim().max(250).nullable().optional(),
  learnedAt: dateStringSchema.optional(),
  reviewDate: dateStringSchema.nullable().optional(),
};

export const createLearningSchema = z
  .object(learningFields)
  .refine((data) => !data.learnedAt || !data.reviewDate || data.reviewDate >= data.learnedAt, {
    message: 'reviewDate must be on or after learnedAt',
    path: ['reviewDate'],
  });

export const updateLearningSchema = z
  .object(learningFields)
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

const learningFilterShape = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().max(100).optional(),
  learnedFrom: dateStringSchema.optional(),
  learnedTo: dateStringSchema.optional(),
  reviewFrom: dateStringSchema.optional(),
  reviewTo: dateStringSchema.optional(),
  sortBy: z.enum(['learnedAt', 'reviewDate', 'createdAt', 'updatedAt', 'title']).default('learnedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
};

const rangeRefinements = <T extends z.ZodType<any>>(schema: T) =>
  schema
    .refine((d: any) => isOrderedRange(d.learnedFrom, d.learnedTo), {
      message: 'learnedFrom must be on or before learnedTo',
      path: ['learnedTo'],
    })
    .refine((d: any) => isOrderedRange(d.reviewFrom, d.reviewTo), {
      message: 'reviewFrom must be on or before reviewTo',
      path: ['reviewTo'],
    });

export const learningQuerySchema = rangeRefinements(paginationQuerySchema.extend(learningFilterShape));

export const searchLearningQuerySchema = rangeRefinements(
  paginationQuerySchema.extend({
    ...learningFilterShape,
    q: z.string().trim().min(1, 'Search query is required').max(250),
  })
);

export const upcomingReviewsQuerySchema = paginationQuerySchema
  .extend({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    days: z.coerce.number().int().min(0).max(365).default(7),
    includeOverdue: z.enum(['true', 'false']).transform((v) => v === 'true').default(true),
    timezone: timezoneSchema.optional(),
  })
  .refine((d) => isOrderedRange(d.startDate, d.endDate), {
    message: 'startDate must be on or before endDate',
    path: ['endDate'],
  });

// ---------------- REVIEWS ----------------
const understandingLevelSchema = z
  .number()
  .int()
  .min(1, 'understandingLevel must be between 1 and 5')
  .max(5, 'understandingLevel must be between 1 and 5');

export const createReviewSchema = z.object({
  reviewedAt: z.string().datetime({ offset: true }).optional(),
  reflection: z.string().max(10000).nullable().optional(),
  understandingLevel: understandingLevelSchema.nullable().optional(),
  // Optionally schedules the next review on the learning entry in the same transaction.
  nextReviewDate: dateStringSchema.nullable().optional(),
});

export const updateReviewSchema = z
  .object({
    reviewedAt: z.string().datetime({ offset: true }).optional(),
    reflection: z.string().max(10000).nullable().optional(),
    understandingLevel: understandingLevelSchema.nullable().optional(),
  })
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const reviewParamsSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  reviewId: z.string().uuid('Invalid UUID format'),
});

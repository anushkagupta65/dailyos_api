import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';
import { dateStringSchema } from '../commitments/commitments.validation';

export { idParamSchema };

export const reviewTypeEnum = z.enum(['daily', 'weekly', 'monthly']);
export const reviewStatusEnum = z.enum(['draft', 'completed']);
export const actionTypeEnum = z.enum(['habit', 'task', 'personal', 'financial', 'learning', 'other']);
export const actionPriorityEnum = z.enum(['low', 'medium', 'high']);
export const actionStatusEnum = z.enum(['open', 'in_progress', 'completed', 'dismissed']);

const ratingValueSchema = z
  .number()
  .int()
  .min(1, 'Rating must be between 1 and 10')
  .max(10, 'Rating must be between 1 and 10');

export const dailyDetailsSchema = z.object({
  intentionSnapshot: z.string().max(2000).nullable().optional(),
  plannedVsActual: z.string().max(10000).nullable().optional(),
  whatWentWell: z.string().max(10000).nullable().optional(),
  whatGotInTheWay: z.string().max(10000).nullable().optional(),
  reflections: z.string().max(10000).nullable().optional(),
  moneyReflection: z.string().max(10000).nullable().optional(),
  tomorrowFocus: z.string().max(10000).nullable().optional(),
});

export const weeklyDetailsSchema = z.object({
  wins: z.string().max(10000).nullable().optional(),
  recurringBlockers: z.string().max(10000).nullable().optional(),
  lessons: z.string().max(10000).nullable().optional(),
  changesNextWeek: z.string().max(10000).nullable().optional(),
  moneyReflection: z.string().max(10000).nullable().optional(),
  nextWeekFocus: z.string().max(10000).nullable().optional(),
});

export const monthlyDetailsSchema = z.object({
  highlights: z.string().max(10000).nullable().optional(),
  whatHeldBack: z.string().max(10000).nullable().optional(),
  learnings: z.string().max(10000).nullable().optional(),
  changesNextMonth: z.string().max(10000).nullable().optional(),
  moneyReflection: z.string().max(10000).nullable().optional(),
  nextMonthFocus: z.string().max(10000).nullable().optional(),
});

export const habitRatingInputSchema = z.object({
  habitId: z.string().uuid('Invalid habit ID'),
  rating: ratingValueSchema,
  notes: z.string().max(2000).nullable().optional(),
});

export const taskRatingInputSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  rating: ratingValueSchema,
  notes: z.string().max(2000).nullable().optional(),
});

export const createReviewActionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(250),
  description: z.string().max(5000).nullable().optional(),
  actionType: actionTypeEnum.default('other'),
  priority: actionPriorityEnum.default('medium'),
  status: actionStatusEnum.default('open'),
  dueDate: dateStringSchema.nullable().optional(),
  linkedTaskId: z.string().uuid('Invalid linked task ID').nullable().optional(),
  createLinkedTask: z.boolean().default(false),
});

export const updateReviewActionSchema = createReviewActionSchema.partial().extend({
  completedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const updateActionStatusSchema = z.object({
  status: actionStatusEnum,
});

export const createReviewSchema = z
  .object({
    reviewType: reviewTypeEnum,
    periodStart: dateStringSchema,
    periodEnd: dateStringSchema.optional(),
    rating: ratingValueSchema.nullable().optional(),
    status: reviewStatusEnum.default('draft'),
    summary: z.string().max(10000).nullable().optional(),
    details: z.record(z.string(), z.any()).optional(),
    habitRatings: z.array(habitRatingInputSchema).optional(),
    taskRatings: z.array(taskRatingInputSchema).optional(),
    actions: z.array(createReviewActionSchema).optional(),
  })
  .refine(
    (data) => !data.periodEnd || data.periodEnd >= data.periodStart,
    {
      message: 'periodEnd must be on or after periodStart',
      path: ['periodEnd'],
    }
  );

export const updateReviewSchema = z
  .object({
    rating: ratingValueSchema.nullable().optional(),
    status: reviewStatusEnum.optional(),
    summary: z.string().max(10000).nullable().optional(),
    details: z.record(z.string(), z.any()).optional(),
  });

export const reviewsQuerySchema = paginationQuerySchema.extend({
  reviewType: reviewTypeEnum.optional(),
  status: reviewStatusEnum.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});

export const actionsQuerySchema = paginationQuerySchema.extend({
  reviewId: z.string().uuid('Invalid review ID').optional(),
  status: actionStatusEnum.optional(),
  priority: actionPriorityEnum.optional(),
  actionType: actionTypeEnum.optional(),
  search: z.string().trim().max(100).optional(),
});

export const summaryQuerySchema = z.object({
  type: z.enum(['weekly', 'monthly']),
  date: dateStringSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});

export const habitRatingsBatchSchema = z.object({
  ratings: z.array(habitRatingInputSchema).min(1, 'At least one rating required'),
});

export const taskRatingsBatchSchema = z.object({
  ratings: z.array(taskRatingInputSchema).min(1, 'At least one rating required'),
});

export const actionParamSchema = z.object({
  actionId: z.string().uuid('Invalid action ID'),
});

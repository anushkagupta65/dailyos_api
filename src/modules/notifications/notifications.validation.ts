import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';
import { timeStringSchema } from '../commitments/commitments.validation';

export { idParamSchema };

export const notificationTypeEnum = z.enum([
  'habit_reminder',
  'task_reminder',
  'payment_reminder',
  'review_reminder',
  'system',
  'security',
  'general',
]);

export const referenceTypeEnum = z.enum([
  'habit',
  'task',
  'recurring_payment',
  'review',
  'account',
  'goal',
  'system',
]);

export const createNotificationSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  message: z.string().trim().min(1, 'Message is required'),
  notificationType: notificationTypeEnum.default('general'),
  referenceType: referenceTypeEnum.nullable().optional(),
  referenceId: z.string().uuid('Invalid reference UUID format').nullable().optional(),
});

export const notificationsQuerySchema = paginationQuerySchema.extend({
  isRead: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean())
    .optional(),
  notificationType: notificationTypeEnum.optional(),
});

export const updateNotificationPreferencesSchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    quietHoursStart: timeStringSchema.nullable().optional(),
    quietHoursEnd: timeStringSchema.nullable().optional(),
    reminderPreferences: z
      .object({
        habits: z.boolean().optional(),
        tasks: z.boolean().optional(),
        recurring_payments: z.boolean().optional(),
        reviews: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .refine(
    (data) => Object.values(data).some((val) => val !== undefined),
    'At least one field must be provided to update preferences'
  );

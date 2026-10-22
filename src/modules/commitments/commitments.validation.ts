import { z } from 'zod';
import { isValidDateString, isValidTimezone, WEEKDAYS } from '../../utils/date';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';

export { idParamSchema };

// ---------------- SHARED ----------------
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(isValidDateString, 'Invalid calendar date');

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be in HH:MM or HH:MM:SS format');

export const timezoneSchema = z
  .string()
  .trim()
  .refine(isValidTimezone, 'Invalid IANA timezone (e.g. Asia/Kolkata)');

const atLeastOneField = (obj: Record<string, unknown>) =>
  Object.values(obj).some((value) => value !== undefined);
const atLeastOneFieldMessage = 'At least one field must be provided';

const MAX_RANGE_DAYS = 366;

const isValidRange = (data: { startDate?: string; endDate?: string }) =>
  !data.startDate || !data.endDate || data.startDate <= data.endDate;

const isWithinMaxRange = (data: { startDate?: string; endDate?: string }) => {
  if (!data.startDate || !data.endDate) return true;
  const diff =
    (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000;
  return diff < MAX_RANGE_DAYS;
};

export const habitTypeEnum = z.enum(['positive', 'avoid']);
export const trackingTypeEnum = z.enum(['boolean', 'count', 'duration', 'quantity']);
export const frequencyTypeEnum = z.enum(['daily', 'weekly', 'custom']);
export const difficultyEnum = z.enum(['easy', 'medium', 'hard']);
export const habitStatusEnum = z.enum(['active', 'paused', 'archived', 'completed']);
export const scheduleTypeEnum = z.enum(['daily', 'selected_days', 'interval']);
export const weekdayEnum = z.enum(WEEKDAYS);
export const logStatusEnum = z.enum(['completed', 'skipped', 'missed', 'partial']);
export const reminderTypeEnum = z.enum(['in_app', 'push', 'email']);
export const periodEnum = z.enum(['day', 'week', 'month']);

// ---------------- CATEGORIES ----------------
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  description: z.string().max(1000).nullable().optional(),
  icon: z.string().trim().max(100).nullable().optional(),
  color: z.string().trim().max(20).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

// ---------------- HABITS ----------------
export const createHabitSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  icon: z.string().trim().max(100).nullable().optional(),
  color: z.string().trim().max(20).nullable().optional(),
  habitType: habitTypeEnum.optional(),
  trackingType: trackingTypeEnum.optional(),
  targetValue: z.number().positive('Target value must be positive').max(99999999.99).nullable().optional(),
  targetUnit: z.string().trim().max(30).nullable().optional(),
  frequencyType: frequencyTypeEnum.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.nullable().optional(),
  preferredTime: timeStringSchema.nullable().optional(),
  cue: z.string().max(2000).nullable().optional(),
  difficulty: difficultyEnum.optional(),
  status: habitStatusEnum.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateHabitSchema = createHabitSchema
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const updateHabitStatusSchema = z.object({
  status: habitStatusEnum,
});

export const habitsQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  status: habitStatusEnum.optional(),
  habitType: habitTypeEnum.optional(),
  frequencyType: frequencyTypeEnum.optional(),
  trackingType: trackingTypeEnum.optional(),
});

// ---------------- SCHEDULES ----------------
export const createScheduleSchema = z.object({
  scheduleType: scheduleTypeEnum,
  weekdays: z.array(weekdayEnum).max(7).optional(),
  intervalDays: z.number().int().min(1).max(365).nullable().optional(),
  effectiveFrom: dateStringSchema.optional(),
  effectiveUntil: dateStringSchema.nullable().optional(),
});

export const updateScheduleSchema = createScheduleSchema
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const scheduleParamsSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  scheduleId: z.string().uuid('Invalid UUID format'),
});

// ---------------- LOGS ----------------
export const createLogSchema = z.object({
  logDate: dateStringSchema,
  status: logStatusEnum.optional(),
  actualValue: z.number().min(0).max(99999999.99).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  completedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const updateLogSchema = createLogSchema
  .omit({ logDate: true })
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const logParamsSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  logId: z.string().uuid('Invalid UUID format'),
});

const dateRangeShape = {
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  timezone: timezoneSchema.optional(),
};

export const habitLogsQuerySchema = paginationQuerySchema
  .extend({
    ...dateRangeShape,
    limit: z.coerce.number().int().min(1).max(100).default(31),
    status: logStatusEnum.optional(),
  })
  .refine(isValidRange, { message: 'startDate must be on or before endDate', path: ['endDate'] });

export const allLogsQuerySchema = paginationQuerySchema
  .extend({
    ...dateRangeShape,
    limit: z.coerce.number().int().min(1).max(100).default(100),
    habitId: z.string().uuid('Invalid habit ID').optional(),
    status: logStatusEnum.optional(),
  })
  .refine(isValidRange, { message: 'startDate must be on or before endDate', path: ['endDate'] })
  .refine(isWithinMaxRange, { message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`, path: ['endDate'] });

export const progressQuerySchema = z
  .object({
    ...dateRangeShape,
    period: periodEnum.optional(),
    date: dateStringSchema.optional(),
    habitId: z.string().uuid('Invalid habit ID').optional(),
  })
  .refine(isValidRange, { message: 'startDate must be on or before endDate', path: ['endDate'] })
  .refine(isWithinMaxRange, { message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`, path: ['endDate'] });

// ---------------- FLEXIBILITY ----------------
export const flexibilitySchema = z.object({
  minimumVersion: z.string().max(2000).nullable().optional(),
  normalVersion: z.string().max(2000).nullable().optional(),
  idealVersion: z.string().max(2000).nullable().optional(),
  alternativeAction: z.string().max(2000).nullable().optional(),
  recoveryRule: z.string().max(2000).nullable().optional(),
  neverMissTwice: z.boolean().optional(),
});

export const updateFlexibilitySchema = flexibilitySchema.refine(
  atLeastOneField,
  atLeastOneFieldMessage
);

// ---------------- REMINDERS ----------------
export const createReminderSchema = z.object({
  reminderTime: timeStringSchema,
  reminderType: reminderTypeEnum.optional(),
  isEnabled: z.boolean().optional(),
});

export const updateReminderSchema = createReminderSchema
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const toggleReminderSchema = z.object({
  isEnabled: z.boolean(),
});

export const reminderParamsSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  reminderId: z.string().uuid('Invalid UUID format'),
});

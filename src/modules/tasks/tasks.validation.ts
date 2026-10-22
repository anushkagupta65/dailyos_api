import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';
import {
  dateStringSchema,
  timeStringSchema,
  timezoneSchema,
} from '../commitments/commitments.validation';

export { idParamSchema };

const atLeastOneField = (obj: Record<string, unknown>) =>
  Object.values(obj).some((value) => value !== undefined);
const atLeastOneFieldMessage = 'At least one field must be provided';

const normalizeTime = (time: string) => (time.length === 5 ? `${time}:00` : time);

export const isValidTimeRange = (startTime?: string | null, endTime?: string | null) =>
  !startTime || !endTime || normalizeTime(endTime) >= normalizeTime(startTime);

export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export const taskStatusEnum = z.enum(['inbox', 'planned', 'active', 'completed', 'cancelled']);
export const taskSourceEnum = z.enum(['manual', 'review_action']);
export const sortOrderEnum = z.enum(['asc', 'desc']);

// ---------------- TASKS ----------------
const taskFields = {
  title: z.string().trim().min(1, 'Title is required').max(250),
  description: z.string().max(5000).nullable().optional(),
  category: z.string().trim().max(100).nullable().optional(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  scheduledDate: dateStringSchema.nullable().optional(),
  dueDate: dateStringSchema.nullable().optional(),
  startTime: timeStringSchema.nullable().optional(),
  endTime: timeStringSchema.nullable().optional(),
  estimatedMinutes: z.number().int().min(0).max(100000).nullable().optional(),
  actualMinutes: z.number().int().min(0).max(100000).nullable().optional(),
  source: taskSourceEnum.optional(),
};

export const createTaskSchema = z
  .object({
    ...taskFields,
    subtasks: z
      .array(z.object({ title: z.string().trim().min(1, 'Subtask title is required').max(200) }))
      .max(50)
      .optional(),
  })
  .refine((data) => isValidTimeRange(data.startTime, data.endTime), {
    message: 'endTime must be on or after startTime',
    path: ['endTime'],
  });

export const updateTaskSchema = z
  .object(taskFields)
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
  note: z.string().trim().max(1000).nullable().optional(),
});

export const tasksQuerySchema = paginationQuerySchema
  .extend({
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    category: z.string().trim().max(100).optional(),
    scheduledDate: dateStringSchema.optional(),
    dueDate: dateStringSchema.optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    dateField: z.enum(['scheduledDate', 'dueDate']).default('scheduledDate'),
    search: z.string().trim().min(1).max(250).optional(),
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'scheduledDate', 'dueDate', 'priority', 'title'])
      .default('createdAt'),
    sortOrder: sortOrderEnum.default('desc'),
    timezone: timezoneSchema.optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: 'startDate must be on or before endDate',
    path: ['endDate'],
  });

// ---------------- SUBTASKS ----------------
export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  isCompleted: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateSubtaskSchema = createSubtaskSchema
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const subtaskParamsSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  subtaskId: z.string().uuid('Invalid UUID format'),
});

// ---------------- RECURRING TASKS ----------------
export const taskRecurrenceFrequencyEnum = z.enum([
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'custom',
]);

export const weekdayEnum = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export const createTaskRecurrenceSchema = z
  .object({
    taskId: z.string().uuid('Invalid task UUID').optional(),
    frequency: taskRecurrenceFrequencyEnum,
    weekdays: z.array(weekdayEnum).default([]),
    intervalValue: z.number().int().min(1, 'intervalValue must be at least 1').default(1),
    startDate: dateStringSchema,
    endDate: dateStringSchema.nullable().optional(),
    nextOccurrence: dateStringSchema.optional(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });

export const updateTaskRecurrenceSchema = z
  .object({
    frequency: taskRecurrenceFrequencyEnum.optional(),
    weekdays: z.array(weekdayEnum).optional(),
    intervalValue: z.number().int().min(1).optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.nullable().optional(),
    nextOccurrence: dateStringSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(atLeastOneField, atLeastOneFieldMessage)
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });

export const taskRecurrencesQuerySchema = paginationQuerySchema.extend({
  isActive: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean())
    .optional(),
  frequency: taskRecurrenceFrequencyEnum.optional(),
  taskId: z.string().uuid().optional(),
});


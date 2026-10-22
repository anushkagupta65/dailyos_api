import { z } from 'zod';

export const periodTypeEnum = z.enum(['week', 'month', '90_days', 'year']);

export const insightQuerySchema = z.object({
  period: periodTypeEnum.optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  timezone: z.string().optional(),
});

export const updateInsightPreferencesSchema = z.object({
  defaultPeriod: periodTypeEnum.optional(),
  defaultFilter: z.string().max(20).optional(),
  showHabits: z.boolean().optional(),
  showMoney: z.boolean().optional(),
});

export const createSnapshotSchema = z.object({
  periodType: periodTypeEnum,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  insightType: z.string().min(1).max(100),
  metrics: z.record(z.string(), z.any()).optional(),
});

export const listSnapshotsQuerySchema = z.object({
  periodType: periodTypeEnum.optional(),
  insightType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid snapshot ID'),
});

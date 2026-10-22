import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';

export { idParamSchema };

export const platformEnum = z.enum([
  'web',
  'ios',
  'android',
  'macos',
  'windows',
  'linux',
  'other',
]);

export const registerDeviceSchema = z.object({
  deviceId: z.string().uuid('Invalid deviceId UUID format').optional(),
  deviceName: z.string().trim().min(1, 'deviceName is required').max(255),
  platform: platformEnum.default('web'),
  registrationInfo: z.record(z.string(), z.any()).default({}),
});

export const syncActionEnum = z.enum(['create', 'update', 'delete']);

export const syncEntityTypeEnum = z.enum([
  'habits',
  'habit_logs',
  'tasks',
  'daily_priorities',
  'daily_intentions',
  'notes',
]);

export const syncChangeItemSchema = z.object({
  entityType: syncEntityTypeEnum,
  action: syncActionEnum,
  id: z.string().uuid().optional(),
  clientId: z.string().optional(),
  clientUpdatedAt: z.string().optional(),
  data: z.record(z.string(), z.any()).optional().default({}),
});

export const syncPullSchema = z.object({
  deviceId: z.string().uuid('Invalid deviceId UUID format'),
  lastServerVersion: z.number().int().min(0).optional(),
  since: z.string().optional(),
});

export const syncPushSchema = z.object({
  deviceId: z.string().uuid('Invalid deviceId UUID format'),
  changes: z.array(syncChangeItemSchema).min(1, 'At least one change item is required'),
});

export const syncStatusQuerySchema = z.object({
  deviceId: z.string().uuid('Invalid deviceId UUID format'),
});

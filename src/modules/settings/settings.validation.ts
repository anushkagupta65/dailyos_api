import { z } from 'zod';
import { isValidTimezone } from '../../utils/date';

export const preferenceThemeEnum = z.enum(['light', 'dark', 'system']);
export const preferenceTimeFormatEnum = z.enum(['12h', '24h']);

export const updatePreferencesSchema = z.object({
  theme: preferenceThemeEnum.optional(),
  accentColor: z.string().max(30).optional(),
  dateFormat: z.string().max(30).optional(),
  timeFormat: preferenceTimeFormatEnum.optional(),
  timezone: z
    .string()
    .max(100)
    .refine((val) => isValidTimezone(val), {
      message: 'Invalid IANA timezone identifier',
    })
    .optional(),
  weekStartsOn: z.number().int().refine((val) => [0, 1, 6].includes(val), {
    message: 'weekStartsOn must be 0 (Sunday), 1 (Monday), or 6 (Saturday)',
  }).optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  language: z.string().max(10).optional(),
});

export const createPreferencesSchema = updatePreferencesSchema;

export const updatePrivacySchema = z.object({
  analyticsConsent: z.boolean().optional(),
  personalizationConsent: z.boolean().optional(),
  healthDataConsent: z.boolean().optional(),
  dataExportEnabled: z.boolean().optional(),
});

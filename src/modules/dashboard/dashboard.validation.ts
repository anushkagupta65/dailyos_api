import { z } from 'zod';
import { DASHBOARD_WIDGETS } from './dashboard.widgets';
import {
  dateStringSchema,
  periodEnum,
  timezoneSchema,
} from '../commitments/commitments.validation';

export const widgetKeyEnum = z.enum(DASHBOARD_WIDGETS);

const isUnique = (items: string[]) => new Set(items).size === items.length;

export const updatePreferencesSchema = z
  .object({
    visibleWidgets: z
      .array(widgetKeyEnum)
      .refine(isUnique, 'Duplicate widgets are not allowed')
      .optional(),
    widgetOrder: z
      .array(widgetKeyEnum)
      .refine(isUnique, 'Duplicate widgets are not allowed')
      .optional(),
    defaultPeriod: periodEnum.optional(),
  })
  .refine(
    (obj) => Object.values(obj).some((value) => value !== undefined),
    'At least one field must be provided'
  );

export const dashboardQuerySchema = z.object({
  date: dateStringSchema.optional(),
  period: periodEnum.optional(),
  timezone: timezoneSchema.optional(),
});

import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';

export { idParamSchema };

export const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const entityTypeEnum = z.enum([
  'task',
  'note',
  'receipt',
  'transaction',
  'profile',
  'profile_picture',
  'document',
  'review',
  'habit',
  'learning',
]);

export const uploadAttachmentSchema = z.object({
  entityType: entityTypeEnum,
  entityId: z.string().uuid('Invalid entity UUID format'),
  fileName: z.string().trim().min(1, 'fileName is required').max(255),
  mimeType: z.string().trim().refine((val) => allowedMimeTypes.includes(val), {
    message: `Unsupported mimeType. Supported types: ${allowedMimeTypes.join(', ')}`,
  }),
  // fileData can be base64-encoded string or data URL
  fileData: z.string().min(1, 'fileData (base64 string) is required'),
});

export const attachmentsQuerySchema = paginationQuerySchema.extend({
  entityType: entityTypeEnum.optional(),
  entityId: z.string().uuid('Invalid entity UUID').optional(),
});

export const entityParamsSchema = z.object({
  entityType: entityTypeEnum,
  entityId: z.string().uuid('Invalid entity UUID format'),
});

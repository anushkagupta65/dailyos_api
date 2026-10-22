import { z } from 'zod';

export const exportTypeEnum = z.enum(['full', 'financial', 'habits', 'personal']);

export const requestExportSchema = z.object({
  exportType: exportTypeEnum.default('full'),
});

export const requestImportSchema = z.object({
  fileName: z.string().min(1).max(255).default('backup.json'),
  data: z.record(z.string(), z.any()).optional(),
  version: z.string().optional(),
  export_type: z.string().optional(),
}).passthrough();

export const listExportsQuerySchema = z.object({
  status: z.enum(['requested', 'processing', 'completed', 'failed', 'expired']).optional(),
  exportType: exportTypeEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const listImportsQuerySchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

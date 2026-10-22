import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../profile/profile.validation';

export { idParamSchema };

const atLeastOneField = (obj: Record<string, unknown>) =>
  Object.values(obj).some((value) => value !== undefined);
const atLeastOneFieldMessage = 'At least one field must be provided';

export const noteTypeEnum = z.enum(['learning', 'reflection', 'observation', 'idea', 'journal', 'general']);

const tagSchema = z.string().trim().min(1, 'Tag cannot be empty').max(100);
export const tagsSchema = z.array(tagSchema).max(30, 'A note can have at most 30 tags');

// ---------------- NOTES ----------------
const noteFields = {
  title: z.string().trim().min(1, 'Title is required').max(250),
  content: z.string().max(50000).nullable().optional(),
  noteType: noteTypeEnum.optional(),
  source: z.string().trim().max(150).nullable().optional(),
  occurredAt: z.string().datetime({ offset: true }).nullable().optional(),
  isPinned: z.boolean().optional(),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
};

export const createNoteSchema = z.object({
  ...noteFields,
  tags: tagsSchema.optional(),
});

export const updateNoteSchema = z
  .object({ ...noteFields, tags: tagsSchema.optional() })
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const pinNoteSchema = z.object({
  isPinned: z.boolean(),
});

export const archiveNoteSchema = z.object({
  archived: z.boolean().default(true),
});

export const noteTagsSchema = z.object({
  tags: tagsSchema,
  mode: z.enum(['replace', 'add']).default('replace'),
});

const notesFilterShape = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  noteType: noteTypeEnum.optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  tag: tagSchema.optional(),
  isPinned: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  archived: z.enum(['true', 'false', 'all']).default('false'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'occurredAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
};

export const notesQuerySchema = paginationQuerySchema.extend(notesFilterShape);

export const searchNotesQuerySchema = paginationQuerySchema.extend({
  ...notesFilterShape,
  q: z.string().trim().min(1, 'Search query is required').max(250),
});

// ---------------- CATEGORIES ----------------
export const createNoteCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  color: z.string().trim().max(20).nullable().optional(),
});

export const updateNoteCategorySchema = createNoteCategorySchema
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

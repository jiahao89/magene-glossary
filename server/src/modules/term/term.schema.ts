import { z } from 'zod';

export const CreateTermSchema = z.object({
  versionId: z.string().uuid(),
  kw: z.string().min(1).max(256),
  zhCn: z.string().min(1),
  context: z.string().optional().default(''),
  ownerComponent: z.string().optional().default(''),
  maxChars: z.number().int().nonnegative().optional().default(0),
  isLocked: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
  translations: z.record(z.string(), z.string()).optional().default({}),
});

export type CreateTermDto = z.infer<typeof CreateTermSchema>;

export const UpdateTermSchema = z.object({
  zhCn: z.string().min(1).optional(),
  context: z.string().optional(),
  ownerComponent: z.string().optional(),
  maxChars: z.number().int().nonnegative().optional(),
  isLocked: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type UpdateTermDto = z.infer<typeof UpdateTermSchema>;

export const UpsertTranslationSchema = z.object({
  languageCode: z.string().min(1).max(32),
  translationText: z.string(),
  sourceType: z.enum(['human', 'ai', 'tm']).optional().default('human'),
});

export type UpsertTranslationDto = z.infer<typeof UpsertTranslationSchema>;

export const QueryTermsSchema = z.object({
  keyword: z.string().optional(),
  subsystem: z.string().optional(),
  isLocked: z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional()),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(500).optional().default(20),
});

export type QueryTermsDto = z.infer<typeof QueryTermsSchema>;

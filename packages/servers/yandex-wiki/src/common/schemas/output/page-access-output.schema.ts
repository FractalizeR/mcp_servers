/**
 * Zod-схема результата (для outputSchema) сущности PageAccess Wiki API —
 * зеркалирует `PageAccess` (`#wiki_api/entities/page-access.entity.ts`),
 * пакет 7.2.D плана модернизации MCP 2026-07-28.
 */

import { z } from 'zod';

const PageAccessUserOutputSchema = z.object({
  uid: z.string().optional(),
  cloud_uid: z.string().optional(),
});

const PageAccessGroupOutputSchema = z.object({
  src: z.enum(['dir', 'cloud', 'com', 'staff']),
  id: z.string(),
});

export const PageAccessOutputSchema = z.object({
  id: z.string(),
  role: z.enum(['reader', 'editor', 'extra_editor', 'author']),
  created_at: z.string().optional(),
  inheritance: z.enum(['inherited', 'not_inherited']).optional(),
  user: PageAccessUserOutputSchema.optional(),
  group: PageAccessGroupOutputSchema.optional(),
});

export type PageAccessOutput = z.infer<typeof PageAccessOutputSchema>;

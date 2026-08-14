/**
 * Zod-схема результата (для outputSchema) сущности Attachment Wiki API —
 * зеркалирует `Attachment` (`#wiki_api/entities/attachment.entity.ts`),
 * пакет 7.2.D плана модернизации MCP 2026-07-28.
 */

import { z } from 'zod';

export const AttachmentOutputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  is_downloadable: z.boolean().optional(),
  download_url: z.string().optional(),
  size: z.number().optional(),
  mimetype: z.string().optional(),
  created_at: z.string().optional(),
  check_status: z.enum(['check', 'ready', 'deleted', 'infected', 'error']).optional(),
  has_preview: z.boolean().optional(),
});

export type AttachmentOutput = z.infer<typeof AttachmentOutputSchema>;

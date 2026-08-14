import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

export const DeleteCommentParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы'),
  comment_id: z.number().int().positive().describe('ID удаляемого комментария'),
});

export type DeleteCommentParams = z.infer<typeof DeleteCommentParamsSchema>;

export const DeleteCommentOutputDataSchema = z.object({
  idx: z.number(),
  comment_id: z.number(),
  comments_count: z.number(),
});

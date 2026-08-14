import { z } from 'zod';
import { PageIdSchema, CommentOutputSchema } from '#common/schemas/index.js';

export const CreateCommentParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы'),
  body: z.string().min(1).describe('Текст комментария'),
  inline_text: z
    .string()
    .optional()
    .describe('Текст страницы, к которому привязан inline-комментарий'),
  parent_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('ID родительского комментария (для ответа в треде)'),
  thread_id: z.number().int().positive().optional().describe('ID треда комментариев'),
});

export type CreateCommentParams = z.infer<typeof CreateCommentParamsSchema>;

export const CreateCommentOutputDataSchema = z.object({
  idx: z.number(),
  comment: CommentOutputSchema,
});

/**
 * Zod схема для валидации параметров DeleteBoardColumnTool
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

export const DeleteBoardColumnParamsSchema = z.object({
  /** Идентификатор доски (обязательно) */
  boardId: z.string().min(1, 'Board ID не может быть пустым'),

  /** Идентификатор колонки для удаления (обязательно) */
  columnId: z.string().min(1, 'Column ID не может быть пустым'),
});

export type DeleteBoardColumnParams = z.infer<typeof DeleteBoardColumnParamsSchema>;

export const DeleteBoardColumnOutputDataSchema = z.object({
  success: z.literal(true),
  boardId: z.string(),
  columnId: z.string(),
  message: z.string(),
});

export const DeleteBoardColumnOutputSchema = buildOutputSchema(DeleteBoardColumnOutputDataSchema);

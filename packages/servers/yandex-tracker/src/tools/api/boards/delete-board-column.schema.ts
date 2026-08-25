/**
 * Zod схема для валидации параметров DeleteBoardColumnTool
 */

import { z } from 'zod';
import { buildOutputSchema, buildEntityIdSchema } from '#common/schemas/index.js';

export const DeleteBoardColumnParamsSchema = z.object({
  /** Идентификатор доски (обязательно) */
  boardId: buildEntityIdSchema('Board'),

  /** Идентификатор колонки для удаления (обязательно) */
  columnId: buildEntityIdSchema('Column'),
});

export type DeleteBoardColumnParams = z.infer<typeof DeleteBoardColumnParamsSchema>;

export const DeleteBoardColumnOutputDataSchema = z.object({
  success: z.literal(true),
  boardId: z.string(),
  columnId: z.string(),
  message: z.string(),
});

export const DeleteBoardColumnOutputSchema = buildOutputSchema(DeleteBoardColumnOutputDataSchema);

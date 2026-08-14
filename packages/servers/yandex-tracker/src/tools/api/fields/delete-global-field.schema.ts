/**
 * Zod схема для валидации параметров DeleteGlobalFieldTool
 *
 * Удаляет ГЛОБАЛЬНОЕ кастомное поле (`DELETE /v2/fields/{fieldId}`) — не
 * локальное поле очереди (для очередей эндпоинта удаления в API нет).
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

export const DeleteGlobalFieldParamsSchema = z.object({
  /** Идентификатор глобального кастомного поля для удаления (обязательно) */
  fieldId: z.string().min(1, 'Field ID не может быть пустым'),
});

export type DeleteGlobalFieldParams = z.infer<typeof DeleteGlobalFieldParamsSchema>;

export const DeleteGlobalFieldOutputDataSchema = z.object({
  success: z.literal(true),
  fieldId: z.string(),
  message: z.string(),
});

export const DeleteGlobalFieldOutputSchema = buildOutputSchema(DeleteGlobalFieldOutputDataSchema);

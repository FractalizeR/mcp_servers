/**
 * Zod схема для валидации параметров UpdateComponentTool
 */

import { z } from 'zod';
import { buildOptimisticLockDescription } from '@fractalizer/mcp-core';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для обновления компонента
 */
export const UpdateComponentParamsSchema = z.object({
  /**
   * ID компонента
   */
  componentId: z.string().min(1, 'Component ID обязателен'),

  /**
   * Новое название компонента (опционально)
   */
  name: z.string().min(1).optional(),

  /**
   * Новое описание компонента (опционально)
   */
  description: z.string().optional(),

  /**
   * Новый руководитель компонента (опционально)
   */
  lead: z.string().optional(),

  /**
   * Автоматическое назначение задач (опционально)
   */
  assignAuto: z.boolean().optional(),

  /**
   * Версия компонента для optimistic locking (опционально).
   *
   * API версию требует: без неё PATCH отвечает 428 «Необходимо указать либо параметр
   * версия, либо значение заголовка If-Match» (живая проба 2026-08-25). До вызывающего
   * этот 428 не доходит — не передана, операция читает текущую версию сама, и правка
   * становится «последний выигрывает»; поэтому параметр объявлен опциональным, а
   * описание не обещает отказа, которого не будет.
   */
  version: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      buildOptimisticLockDescription({
        paramName: 'version',
        source: 'в ответе get_components (запроси его в fields)',
        conflict: 'silent-overwrite',
      })
    ),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'name'], ['id', 'name', 'description', 'lead.display']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type UpdateComponentParams = z.infer<typeof UpdateComponentParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const UpdateComponentOutputDataSchema = z.object({
  component: FilteredEntitySchema,
  message: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const UpdateComponentOutputSchema = buildOutputSchema(UpdateComponentOutputDataSchema);

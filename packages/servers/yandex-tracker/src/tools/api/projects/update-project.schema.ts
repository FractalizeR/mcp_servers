/**
 * Zod схема для валидации параметров UpdateProjectTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import { BaseProjectFieldsSchema } from './base-project.schema.js';

/**
 * Схема параметров для обновления проекта
 *
 * Состав тела правки отличается от создания и держится на живой пробе 2026-08-25:
 * `queueIds` API отвергает (`400 queueIds: Incorrect data format`), очередь задаётся
 * ключом строкой в `queues` — как и при создании. Прежнее утверждение «правка
 * продолжает принимать `queueIds`/`teamUserIds`» (этап 1.1, `0_CONTRACTS.md`, D8)
 * опровергнуто: оно снималось при инструменте, который не работал вовсе (428).
 *
 * Использует базовую схему проекта с:
 * - projectId: обязательно (вместо key)
 * - все остальные поля: опционально (через .partial())
 */
export const UpdateProjectParamsSchema = z
  .object({
    /**
     * ID или ключ проекта (обязательно)
     */
    projectId: z.string().min(1, 'ID проекта не может быть пустым'),

    /**
     * Версия проекта для optimistic locking (опционально)
     *
     * API требует версию: без неё PATCH отвечает 428 «Необходимо указать либо параметр
     * версия, либо значение заголовка If-Match» — проверено живьём 2026-08-25, до этой
     * даты инструмент не работал вовсе. Не передана — операция читает текущую версию
     * сама, и правка становится «последний выигрывает». Значение бери из поля `version`
     * проекта, чтобы получить отказ при конфликте вместо перезаписи чужих изменений.
     */
    version: z.number().int().positive().optional(),

    /**
     * Список полей для возврата (обязательно)
     */
    fields: FieldsSchema,
  })
  .merge(BaseProjectFieldsSchema.partial())
  .merge(
    z
      .object({
        /**
         * Ключ очереди проекта (не ID) — справочник `get_queues`, поле `key`
         */
        queues: z.string().min(1),

        /**
         * Массив ID или login участников проекта
         *
         * НЕ ПРОВЕРЕНО живьём: рубеж прогона отклоняет назначение участников, а в
         * перечне документации (`api-ref/projects/update-project`) параметра нет.
         * Его сосед `queueIds`, объявленный тем же непроверенным утверждением, живой
         * пробой опровергнут — этот параметр под тем же подозрением.
         */
        teamUserIds: z.array(z.string()),
      })
      .partial()
  );

/**
 * Вывод типа из схемы
 */
export type UpdateProjectParams = z.infer<typeof UpdateProjectParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const UpdateProjectOutputDataSchema = z.object({
  projectKey: z.string(),
  project: FilteredEntitySchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const UpdateProjectOutputSchema = buildOutputSchema(UpdateProjectOutputDataSchema);

/**
 * Zod схема для валидации параметров UpdateProjectTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import { BaseProjectFieldsSchema } from './base-project.schema.js';

/**
 * Схема параметров для обновления проекта
 *
 * В отличие от создания, правка проекта (`PATCH /v3/projects/{id}`) продолжает
 * принимать `queueIds`/`teamUserIds` (этап 1.1, раздельные перечни ключей —
 * см. `0_CONTRACTS.md`, D8) — это осталось вне базовой схемы, общей с созданием.
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
     * Список полей для возврата (обязательно)
     */
    fields: FieldsSchema,
  })
  .merge(BaseProjectFieldsSchema.partial())
  .merge(
    z
      .object({
        /**
         * Массив ключей очередей, связанных с проектом
         */
        queueIds: z.array(z.string()),

        /**
         * Массив ID или login участников проекта
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

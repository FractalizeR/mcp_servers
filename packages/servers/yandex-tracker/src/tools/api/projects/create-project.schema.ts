/**
 * Zod схема для валидации параметров CreateProjectTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import { BaseProjectFieldsSchema } from './base-project.schema.js';

/**
 * Схема параметров для создания проекта
 *
 * `POST /v3/projects` не знает параметра `key` (назначается сервером, `400 key:
 * Incorrect data format` на любую присланную форму) и требует вместо `queueIds`
 * ключ одной очереди строкой — `queues` (D8, `0_CONTRACTS.md`). `lead` в API
 * опционален.
 *
 * Использует базовую схему проекта с:
 * - name: обязательно (из базовой схемы)
 * - queues: обязательно
 * - lead и остальные базовые поля: опционально (через .partial())
 */
export const CreateProjectParamsSchema = z
  .object({
    /**
     * Ключ очереди, в портфель которой добавляется проект (обязательно)
     */
    queues: z
      .string()
      .min(1, 'Ключ очереди не может быть пустым')
      .describe('Ключ очереди (не ID) — справочник get_queues, поле key'),
  })
  .merge(BaseProjectFieldsSchema.pick({ name: true }))
  .merge(BaseProjectFieldsSchema.omit({ name: true }).partial())
  .merge(
    z.object({
      /**
       * Список полей для возврата (обязательно)
       */
      fields: FieldsSchema,
    })
  );

/**
 * Вывод типа из схемы
 */
export type CreateProjectParams = z.infer<typeof CreateProjectParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const CreateProjectOutputDataSchema = z.object({
  projectKey: z.string(),
  project: FilteredEntitySchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const CreateProjectOutputSchema = buildOutputSchema(CreateProjectOutputDataSchema);

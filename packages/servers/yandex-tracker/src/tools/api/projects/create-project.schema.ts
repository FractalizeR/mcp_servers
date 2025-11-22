/**
 * Zod схема для валидации параметров CreateProjectTool
 */

import { z } from 'zod';
import { FieldsSchema } from '#common/schemas/index.js';
import { BaseProjectFieldsSchema } from './base-project.schema.js';

/**
 * Схема параметров для создания проекта
 *
 * Использует базовую схему проекта с:
 * - key: обязательно
 * - name, lead: обязательно (из базовой схемы)
 * - остальные поля: опционально (через .partial())
 */
export const CreateProjectParamsSchema = z
  .object({
    /**
     * Уникальный ключ проекта (обязательно)
     */
    key: z.string().min(1, 'Ключ проекта не может быть пустым'),
  })
  .merge(BaseProjectFieldsSchema.pick({ name: true, lead: true }))
  .merge(BaseProjectFieldsSchema.omit({ name: true, lead: true }).partial())
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

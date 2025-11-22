/**
 * Zod схема для валидации параметров UpdateProjectTool
 */

import { z } from 'zod';
import { FieldsSchema } from '#common/schemas/index.js';
import { BaseProjectFieldsSchema } from './base-project.schema.js';

/**
 * Схема параметров для обновления проекта
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
  .merge(BaseProjectFieldsSchema.partial());

/**
 * Вывод типа из схемы
 */
export type UpdateProjectParams = z.infer<typeof UpdateProjectParamsSchema>;

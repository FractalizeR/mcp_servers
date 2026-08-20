/**
 * Zod схема для валидации параметров UpdateIssueTool
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для обновления задачи
 */
export const UpdateIssueParamsSchema = z
  .object({
    /**
     * Ключ задачи для обновления
     */
    issueId: IssueKeySchema,

    /**
     * Краткое описание задачи
     */
    summary: z.string().min(1).optional().describe('Краткое описание задачи'),

    /**
     * Подробное описание задачи
     */
    description: z.string().optional().describe('Подробное описание задачи'),

    /**
     * Исполнитель (логин или UID)
     */
    assignee: z.string().min(1).optional().describe('Исполнитель (логин или UID)'),

    /**
     * Приоритет (ключ приоритета)
     */
    priority: z.string().min(1).optional().describe('Приоритет (ключ приоритета)'),

    /**
     * Тип задачи (ключ типа)
     */
    type: z.string().min(1).optional().describe('Тип задачи (ключ типа)'),

    /**
     * Кастомные поля для дополнительных полей Трекера
     */
    customFields: z.record(z.string(), z.unknown()).optional().describe('Кастомные поля'),

    /**
     * Версия задачи для optimistic locking (защита от параллельных перезаписей)
     */
    version: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Версия задачи для optimistic locking. Передаётся как query-параметр version в PATCH; ' +
          'если версия задачи на сервере уже другая (параллельное изменение), API вернёт ошибку ' +
          'конфликта вместо молчаливой перезаписи чужих изменений. Значение бери из поля version ' +
          'задачи, полученного через get_issues/find_issues.'
      ),

    /**
     * Опциональный массив полей для фильтрации ответа
     */
    fields: FieldsSchema,
  })
  .describe(
    'Обновляет summary/description/assignee/priority/type/customFields существующей задачи ' +
      '(PATCH /v3/issues/{issueId}). Статус НЕ входит в параметры: API отклоняет прямое ' +
      'изменение статуса через этот эндпоинт (поле только для чтения) — используй ' +
      'transition_issue для смены статуса по workflow.'
  );

/**
 * Вывод типа из схемы
 */
export type UpdateIssueParams = z.infer<typeof UpdateIssueParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const UpdateIssueOutputDataSchema = z.object({
  issueId: z.string(),
  updatedFields: z.array(z.string()),
  issue: FilteredEntitySchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const UpdateIssueOutputSchema = buildOutputSchema(UpdateIssueOutputDataSchema);

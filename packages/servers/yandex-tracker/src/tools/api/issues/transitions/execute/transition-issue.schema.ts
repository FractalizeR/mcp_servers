/**
 * Zod схема для валидации параметров TransitionIssueTool
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для выполнения перехода задачи
 */
export const TransitionIssueParamsSchema = z.object({
  /**
   * Ключ задачи для перехода
   */
  issueId: IssueKeySchema,

  /**
   * Идентификатор перехода (получается из GetIssueTransitionsTool)
   */
  transitionId: z.string().min(1, 'Идентификатор перехода не может быть пустым'),

  /**
   * Комментарий при переходе (опционально)
   */
  comment: z.string().optional(),

  /**
   * Дополнительные поля для заполнения при переходе (опционально)
   * Например: { "resolution": "fixed", "customField": "value" }
   */
  customFields: z.record(z.string(), z.unknown()).optional(),

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema.optional(),
});

/**
 * Вывод типа из схемы
 */
export type TransitionIssueParams = z.infer<typeof TransitionIssueParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * `issue`/`refetchFailed` (находка №1, внешнее ревью 2026-08): переход
 * выполняется в два шага — POST `_execute`, затем GET для актуального
 * состояния задачи. Если POST успешен, а GET проваливается (сеть/таймаут/429),
 * переход СЧИТАЕТСЯ выполненным (`success: true`) — иначе агент, поверив в
 * ошибку, рискует повторить не идемпотентный переход. В этом случае `issue`
 * отсутствует, а `refetchFailed: true` явно сообщает: "переход выполнен,
 * но актуальное состояние задачи получить не удалось — перечитайте задачу
 * отдельным вызовом (get_issues), не полагаясь на это поле".
 */
export const TransitionIssueOutputDataSchema = z.object({
  issueId: z.string(),
  transitionId: z.string(),
  issue: FilteredEntitySchema.optional().describe(
    'Актуальное состояние задачи после перехода. Отсутствует, если переход ' +
      'выполнен, но дочитывание провалилось (см. refetchFailed)'
  ),
  refetchFailed: z
    .boolean()
    .optional()
    .describe(
      'true, если переход выполнен успешно, но дочитывание актуального ' +
        'состояния задачи (GET) провалилось — поле issue отсутствует. ' +
        'Переход НЕ повторять; актуальное состояние получить отдельно ' +
        '(get_issues)'
    ),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const TransitionIssueOutputSchema = buildOutputSchema(TransitionIssueOutputDataSchema);

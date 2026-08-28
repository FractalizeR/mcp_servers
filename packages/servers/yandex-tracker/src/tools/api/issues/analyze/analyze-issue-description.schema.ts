/**
 * Zod схема для валидации параметров AnalyzeIssueDescriptionTool
 * (пакет 6.1 — пилот MCP Apps №1).
 */

import { z } from 'zod';
import { IssueKeySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров анализа description задачи.
 *
 * НЕТ параметра `fields` (отклонение от общего правила «все tools, вернувшие
 * объекты API, обязаны иметь `fields`», см. src/tools/README.md §5): этот
 * инструмент не проецирует произвольные поля сущности API — он возвращает
 * СИНТЕЗИРОВАННЫЙ результат анализа с фиксированным составом
 * (currentDescription/suggestedDescription/notes/version), который `fields`
 * не сокращает ни на один токен.
 */
export const AnalyzeIssueDescriptionParamsSchema = z
  .object({
    issueId: IssueKeySchema,
  })
  .describe(
    'Анализирует description задачи (GET /v3/issues/{issueId}) и предлагает правку: ' +
      'детерминированные эвристики (не внешняя LLM) проверяют пустоту/длину и наличие ' +
      'типовых разделов (Контекст/Критерии приемки). Текущее и предложенное описание ' +
      'возвращаются рядом — правку применяет update_issue (сам агент в fallback-режиме, ' +
      'или сам виджет через postMessage, если хост поддерживает MCP Apps).'
  );

export type AnalyzeIssueDescriptionParams = z.infer<typeof AnalyzeIssueDescriptionParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`).
 */
export const AnalyzeIssueDescriptionOutputDataSchema = z.object({
  issueId: z.string(),
  currentDescription: z
    .string()
    .describe(
      'description задачи ровно в том виде, в каком его хранит Трекер: разметка YFM не ' +
        'вычищается — этот текст применяется обратно через update_issue'
    ),
  suggestedDescription: z
    .string()
    .describe('Предложенная правка — редактируется в виджете/диалоге'),
  notes: z.array(z.string()).describe('Что именно эвристика заметила/поправила'),
  version: z
    .number()
    .optional()
    .describe('Версия задачи для optimistic locking последующего update_issue, если известна'),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const AnalyzeIssueDescriptionOutputSchema = buildOutputSchema(
  AnalyzeIssueDescriptionOutputDataSchema
);

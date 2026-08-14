/**
 * Общие Zod-строительные блоки для outputSchema инструментов (пакет 3.1.C.tracker)
 *
 * Зачем отдельный файл: `outputSchema` каждого инструмента описывает ЕДИНЫЙ success
 * envelope `{ success: true, data }`, который собирает `BaseTool.formatSuccess()`
 * (framework, не трогаем). Эти хелперы избавляют 50 tool-специфичных `*.schema.ts`
 * от повторения одной и той же обёртки и повторяющихся кусков (пагинация,
 * отфильтрованная сущность, список полей, вернувшихся в ответе).
 *
 * ВАЖНО про "отфильтрованные" сущности (issue/project/queue/component/...): все они
 * проходят через `ResponseFieldFilter.filter(entity, fields)` — набор полей в ответе
 * определяется параметром `fields`, переданным вызывающим агентом, а не статическим
 * типом entity. Поэтому их форма в outputSchema принципиально не может быть строже,
 * чем "объект с произвольными полями" — `FilteredEntitySchema`. Это не недосмотр, а
 * точное отражение реального поведения фильтра.
 */

import { z } from 'zod';
import { generateDefinitionFromSchema } from '@fractalizer/mcp-core';
import type { JsonObjectSchema } from '@fractalizer/mcp-core';

/**
 * Отфильтрованная по `fields` сущность API (issue/project/queue/component/...).
 *
 * Ключи — имена полей (в т.ч. вложенные через dot-notation, разворачиваемые
 * ResponseFieldFilter в вложенный объект), значения — `unknown`: конкретный набор
 * зависит от параметра `fields` запроса, а не от статической схемы.
 */
export const FilteredEntitySchema = z
  .record(z.string(), z.unknown())
  .describe('Объект с полями, отфильтрованными по параметру fields запроса');

/**
 * Список фактически возвращённых полей — эхо входного параметра `fields`.
 */
export const FieldsReturnedSchema = z
  .array(z.string())
  .describe('Список полей, фактически возвращённых в ответе (эхо параметра fields)');

/**
 * Метаданные пагинации list-эндпоинтов — зеркалирует `PaginationMeta`
 * (`src/tracker_api/entities/common/pagination.entity.ts`). `total`/`totalPages`
 * заполняются только у seekable-эндпоинтов, поэтому здесь они опциональны.
 */
export const PaginationMetaSchema = z.object({
  nextCursor: z.string().optional().describe('Непрозрачный курсор следующей страницы'),
  perPage: z.number().optional().describe('Размер страницы'),
  total: z.number().optional().describe('Общее количество элементов (только seekable)'),
  totalPages: z.number().optional().describe('Общее количество страниц (только seekable)'),
  hasNextPage: z.boolean().describe('Есть ли ещё данные за пределами возвращённых элементов'),
  fetchedAll: z.boolean().describe('Возвращён полный набор данных'),
  truncated: z.boolean().describe('Выдача обрезана защитным лимитом (maxItems/maxPages)'),
  pagesFetched: z.number().describe('Сколько страниц фактически загружено'),
  hasError: z.boolean().describe('При обходе (fetchAll) произошла ошибка после части страниц'),
});

/**
 * Элемент ошибки batch-операции — форма `{ <idField>: string, error: string }`
 * встречается почти во всех batch tools под разными именами id-поля
 * (issueId/key/...). Фабрика параметризует только имя ключа.
 */
export function makeBatchErrorItemSchema<TKey extends string>(
  keyField: TKey
): z.ZodObject<{ [K in TKey]: z.ZodString } & { error: z.ZodString }> {
  return z.object({
    [keyField]: z.string(),
    error: z.string(),
  }) as unknown as z.ZodObject<{ [K in TKey]: z.ZodString } & { error: z.ZodString }>;
}

/**
 * Обернуть Zod-схему данных инструмента в единый success envelope
 * `{ success: true, data }` — форма, в которой `BaseTool.formatSuccess()`
 * отдаёт и `structuredContent`, и текстовый дубль (см. base-tool.ts).
 */
export function successEnvelopeSchema<T extends z.ZodRawShape>(
  dataSchema: z.ZodObject<T>
): z.ZodObject<{ success: z.ZodLiteral<true>; data: z.ZodObject<T> }> {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

/**
 * Собрать `outputSchema` (JSON Schema 2020-12) инструмента из Zod-схемы данных.
 *
 * Оборачивает `dataSchema` в success envelope и прогоняет через тот же генератор,
 * что и `inputSchema` (`generateDefinitionFromSchema`) — гарантирует одинаковый
 * диалект/структуру ($defs, additionalProperties и т.д.) для input и output.
 */
export function buildOutputSchema<T extends z.ZodRawShape>(
  dataSchema: z.ZodObject<T>
): JsonObjectSchema {
  return generateDefinitionFromSchema(successEnvelopeSchema(dataSchema)) as JsonObjectSchema;
}

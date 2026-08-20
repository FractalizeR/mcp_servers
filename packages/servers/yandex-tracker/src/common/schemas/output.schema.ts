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
 *
 * `successEnvelopeSchema`/`buildOutputSchema` САМИ здесь больше не реализуются —
 * пакет 3.1.G свёл параллельно изобретённые копии (Трекер/Вики) в
 * одну, во framework (`@fractalizer/mcp-core`). Реэкспорт ниже сохраняет прежний
 * путь импорта (`#common/schemas/index.js`) для ~50 `*.schema.ts` файлов и для
 * контрактного теста `tool-output-schema-representatives.test.ts`, который
 * волна 3.1.C зафиксировала как неприкасаемый.
 */

import { z } from 'zod';

export { successEnvelopeSchema, buildOutputSchema } from '@fractalizer/mcp-core';

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
 * Значение поля `error` элемента batch-ошибки.
 *
 * `BatchResultProcessor.process()` (`@fractalizer/mcp-core`,
 * `src/utils/batch-result-processor.ts`) кладёт сюда либо строку (обычный `Error`/
 * произвольная причина отказа), либо полный `ApiErrorClass.toJSON()` — объект вида
 * `ApiErrorDetails` (`@fractalizer/mcp-infrastructure`,
 * `src/http/error/api-error.class.ts`). Схема обязана описывать ровно то, что
 * фактически может прийти в рантайме, иначе клиент MCP отбраковывает валидный ответ
 * с частичным отказом (см. план `1.1_common_error_contract_sequential.md`).
 *
 * Объектная ветвь описывает только гарантированные `ApiErrorDetails` поля
 * (`statusCode`, `message`) и опциональные (`errors`, `retryAfter`) явно, а
 * `.passthrough()` пропускает остальные (например `errorsData`, чья форма не
 * гарантирована API) — `ApiErrorDetails` расширяем, и схема не должна ломаться при
 * появлении новых полей.
 *
 * `errors` (детали по полям, обычно для 400): TypeScript-тип `ApiErrorDetails.errors`
 * (`@fractalizer/mcp-infrastructure`, `src/http/error/api-error.class.ts`) объявляет
 * `Record<string, string[]>`, но `ErrorMapper.mapResponseError()`
 * (`src/http/error/error-mapper.ts:71`) берёт значение НЕВАЛИДИРОВАННЫМ кастом из
 * тела ответа Трекера — рантайм-форма ничем не подтверждена. Референсный клиент
 * (`yandex_tracker_client/exceptions.py:84-87`) форматирует значение по ключу как
 * СКАЛЯР (`u"- {}: {}".format(key, message)`), а не массив. Схема, объявляющая только
 * массив, отбраковывает валидный batch-ответ при скалярной форме — ровно тот отказ,
 * который вся эта волна фиксов устраняла (см. BLOCKER находка 1 внешнего ревью).
 * Поэтому здесь описано ОБА варианта, гарантированных фактами: строка на ключ или
 * массив строк на ключ.
 */
export const BatchErrorValueSchema = z.union([
  z.string().describe('Текстовое описание ошибки (например, message обычного Error)'),
  z
    .object({
      statusCode: z.number().describe('HTTP статус-код ошибки'),
      message: z.string().describe('Сообщение об ошибке'),
      errors: z
        .record(z.string(), z.union([z.string(), z.array(z.string())]))
        .optional()
        .describe(
          'Детализированные ошибки по полям (для 400 ошибок). Значение по ключу — ' +
            'строка или массив строк: форма зависит от ответа Трекера, не валидируется на приёме'
        ),
      retryAfter: z
        .number()
        .optional()
        .describe('Время ожидания перед повторной попыткой в секундах (для 429 ошибок)'),
    })
    .passthrough()
    .describe('Полные детали API-ошибки (ApiErrorClass.toJSON())'),
]);

/**
 * Элемент ошибки batch-операции — форма `{ <idField>: string, error: BatchErrorValueSchema }`
 * встречается почти во всех batch tools под разными именами id-поля
 * (issueId/key/...). Фабрика параметризует только имя ключа.
 */
export function makeBatchErrorItemSchema<TKey extends string>(
  keyField: TKey
): z.ZodObject<{ [K in TKey]: z.ZodString } & { error: typeof BatchErrorValueSchema }> {
  return z.object({
    [keyField]: z.string(),
    error: BatchErrorValueSchema,
  }) as unknown as z.ZodObject<
    { [K in TKey]: z.ZodString } & { error: typeof BatchErrorValueSchema }
  >;
}

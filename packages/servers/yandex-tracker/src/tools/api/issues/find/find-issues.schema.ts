/**
 * Zod схема для валидации параметров FindIssuesTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  CursorSchema,
  makePerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  noCursorWithBulkParams,
  PAGINATION_CURSOR_CONFLICT_MESSAGE,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  PaginationMetaSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';
import { collectionResponseModeParamSchema, ResourceLinkDataSchema } from '@fractalizer/mcp-core';

/**
 * Схема параметров для поиска задач
 *
 * ВАЖНО: Хотя бы один из способов поиска должен быть указан
 */
export const FindIssuesParamsSchema = z
  .object({
    /**
     * Язык запросов Трекера (query language)
     * Пример: "Author: me() Resolution: empty()"
     */
    query: z.string().optional(),

    /**
     * Фильтр по полям (объект key-value)
     * Пример: { queue: "PROJ", status: "open" }
     */
    filter: z.record(z.string(), z.unknown()).optional(),

    /**
     * Список ключей задач
     * Пример: ["PROJ-1", "PROJ-2"]
     */
    keys: z.array(z.string()).optional(),

    /**
     * Ключ очереди
     * Пример: "DEVOPS"
     */
    queue: z.string().optional(),

    /**
     * ID сохранённого фильтра
     */
    filterId: z.string().optional(),

    /**
     * Сортировка результатов
     * Формат: ["+field1", "-field2"]
     * Пример: ["+created", "-priority"]
     */
    order: z.array(z.string()).optional(),

    /**
     * Количество результатов на странице (без жёсткого потолка для _search)
     */
    perPage: makePerPageSchema(),

    /**
     * Непрозрачный курсор следующей страницы (из pagination.nextCursor).
     *
     * При курсоре критерии поиска (query/filter/keys/queue/filterId/order)
     * ОБЯЗАНЫ быть переданы повторно: операция сверяет их хеш с хешем в курсоре.
     *
     * Описание переопределено локально (не трогая общую `CursorSchema` из
     * `#common/schemas`): именно у `find_issues` курсор без повторно
     * переданных критериев отклоняется тем же рефайном, что требует «хотя бы
     * один способ поиска» (query/filter/keys/queue/filterId) — правило должно
     * быть видно ДО вызова, а не только в тексте рантайм-ошибки.
     */
    cursor: CursorSchema.describe(
      'Непрозрачный курсор следующей страницы из pagination.nextCursor. ' +
        'ОБЯЗАТЕЛЬНО повторно передать вместе с ним те же критерии поиска ' +
        '(query/filter/keys/queue/filterId и, если использовался, order), которыми ' +
        'курсор был получен, — иначе вызов будет отклонён валидацией "хотя бы один ' +
        'способ поиска". Курсор сам по себе способом поиска не считается. ' +
        'Использовать ТОЛЬКО с тем же инструментом, который его выдал. ' +
        'Несовместим с perPage/fetchAll/maxItems/maxTotalItems.'
    ),

    /**
     * Расширение ответа дополнительными полями
     * Возможные значения: "transitions", "attachments"
     */
    expand: z.array(z.string()).optional(),

    /**
     * Полный обход всех страниц (opt-in). Несовместимо с cursor.
     */
    fetchAll: FetchAllSchema,

    /**
     * Защитный лимит по количеству задач при fetchAll=true.
     */
    maxItems: MaxItemsSchema,

    /**
     * Режим ответа коллекции (пакет 5.1.C.tracker): тела задач инлайном или
     * компактные resource_link (см. `collectionResponseModeParamSchema` —
     * описание параметра, видимое агенту, само называет порог).
     */
    responseMode: collectionResponseModeParamSchema({ itemsNoun: 'задач' }),

    /**
     * Опциональный массив полей для фильтрации ответа
     */
    fields: FieldsSchema,
  })
  .refine(
    (data) => {
      // Проверка: хотя бы один способ поиска должен быть указан
      return (
        data.query !== undefined ||
        data.filter !== undefined ||
        (data.keys !== undefined && data.keys.length > 0) ||
        data.queue !== undefined ||
        data.filterId !== undefined
      );
    },
    {
      message:
        'Должен быть указан хотя бы один способ поиска: query, filter, keys, queue или filterId',
    }
  )
  .refine(noCursorWithBulkParams, {
    message: PAGINATION_CURSOR_CONFLICT_MESSAGE,
    path: ['cursor'],
  });

/**
 * Вывод типа из схемы
 */
export type FindIssuesParams = z.infer<typeof FindIssuesParamsSchema>;

/**
 * Агрегаты поиска, не зависящие от режима ответа (`links`/`full`) — пагинация
 * Трекера, эхо `fields` и флаги примененных критериев поиска. Раньше эти три
 * поля лежали на верхнем уровне `data` вместе с `issues`/`count`; теперь они
 * под `summary` — форма, заданная `BaseTool.formatCollectionResult()` (пакет
 * 5.1.B): `{ mode, itemsOnPage, threshold, summary?, items? | resourceLinks? }`.
 */
export const FindIssuesSummarySchema = z.object({
  pagination: PaginationMetaSchema,
  fieldsReturned: FieldsReturnedSchema,
  searchCriteria: z.object({
    hasQuery: z.boolean(),
    hasFilter: z.boolean(),
    keysCount: z.number(),
    hasQueue: z.boolean(),
    /**
     * Ключи из `keys`, которые не нашлись в ответе Трекера (дефект №3:
     * `find_issues` тихо теряет ненайденные ключи, оставляя единственным
     * намёком расхождение `keysCount` и `itemsOnPage`). Присутствует ТОЛЬКО
     * когда поиск шёл по `keys` И выдача заведомо полная
     * (`pagination.fetchedAll === true`) — иначе поле опускается: находка №2
     * (MAJOR, внешнее ревью 2026-08) показала, что `result.items` может быть
     * лишь одной страницей, и подсчёт по неполной выдаче ложно записывал в
     * notFoundKeys ключи, которые просто не поместились на странице (риск
     * дубля при создании агентом задачи «взамен несуществующей» — цена ВЫШЕ
     * исходной тихой потери). Пустой массив означает «все ключи найдены».
     * Сравнение регистрозависимое: Трекер не считает ключи задач
     * регистронезависимыми (queue-префикс канонически в верхнем регистре,
     * `test-15` не совпадёт с `TEST-15`).
     */
    notFoundKeys: z.array(z.string()).optional(),
  }),
});

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`).
 *
 * НЕ через `buildCollectionOutputSchema()` (framework, пакет 5.1.B): тот хелпер
 * требует `z.ZodObject` для схемы элемента, а `FilteredEntitySchema` — это
 * `z.record(...)` (форма отфильтрованной сущности принципиально произвольна,
 * см. output.schema.ts) — типы несовместимы. Форма ниже — та же самая, что
 * строит `buildCollectionOutputSchema`, просто собрана вручную под
 * `FilteredEntitySchema`.
 */
export const FindIssuesOutputDataSchema = z.object({
  mode: z.enum(['links', 'full']),
  itemsOnPage: z.number(),
  threshold: z.number(),
  summary: FindIssuesSummarySchema,
  items: z.array(FilteredEntitySchema).optional(),
  resourceLinks: z.array(ResourceLinkDataSchema).optional(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const FindIssuesOutputSchema = buildOutputSchema(FindIssuesOutputDataSchema);

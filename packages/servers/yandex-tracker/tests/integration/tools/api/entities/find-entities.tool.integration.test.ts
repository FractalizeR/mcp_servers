/**
 * Интеграционный тест `find_entities` на фабрике `describeToolIntegration`
 * (план 2.1.2, пакет P2). Entity API в реестре исключений живых прогонов
 * (`tests/TESTING_STRATEGY.md` §1).
 *
 * API: `POST /v3/entities/{entityType}/_search` — путь/метод и конверт ответа
 * `{ hits, pages, values }` подтверждены официальной документацией
 * (yandex.ru/support/tracker/en/api-ref/entities/search-entities); НЕ конверт,
 * предполагаемый референсным клиентом (голый массив + `Link`, см. JSDoc
 * `find-entities.operation.ts`) — здесь референсный клиент расходится с
 * официальной документацией и с наблюдаемым в проде поведением, а не наоборот.
 *
 * Тип постранички — `'offset'`: `find-entities.operation.ts` явно строит
 * следующую страницу по номеру (`page`/`perPage` в query, счётчики `hits`/`pages`
 * из ТЕЛА ответа), а не по заголовку `Link rel="next"`/`rel="seek"` — единственный
 * из пагинируемых эндпоинтов Трекера без какого-либо участия `Link`. Наружу это
 * остаётся тем же непрозрачным курсором, что и у прочих list-инструментов
 * (агент передаёт `pagination.nextCursor` не глядя на номера страниц) — тип
 * здесь описывает ВНУТРЕННИЙ механизм, не внешний контракт.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createEntityApiRecordFixture } from '#helpers/entity-api.fixture.js';
import { FIND_ENTITIES_TOOL_METADATA } from '#tools/api/entities/find-entities.metadata.js';
import { FindEntitiesOutputDataSchema } from '#tools/api/entities/find-entities.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertContractualError,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

// `FindEntitiesOperation.buildEndpoint` вшивает `perPage`/`page`/`fields`
// (MCP-проекция `fields` через `extractEntityApiFields`) в query; `perPage`
// по умолчанию — `DEFAULT_MAX_PER_PAGE` (100), если вход его не передал.
// `searchString`/`filter`/`orderBy`/`orderAsc`/`rootOnly` уходят в ТЕЛО
// (`buildRequestBody`), не в query.
describeToolIntegration({
  tool: FIND_ENTITIES_TOOL_METADATA.name,

  expectedRequests: [
    {
      method: 'post',
      path: '/v3/entities/goal/_search',
      apiVersion: 'v3',
      query: { perPage: 2, page: 1, fields: 'summary' },
    },
  ],

  happyPath: {
    input: {
      entityType: 'goal',
      perPage: 2,
      searchString: 'roadmap',
      filter: { status: 'open' },
      orderBy: 'summary',
      orderAsc: true,
      rootOnly: true,
      fields: ['id', 'fields.summary'],
    },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/entities/goal/_search',
          apiVersion: 'v3',
          query: { perPage: 2, page: 1, fields: 'summary' },
          // searchString/filter/orderBy/orderAsc/rootOnly — весь содержательный
          // вход инструмента; без сверки тела кейс не отличил бы потерю любого
          // из них при передаче в операцию.
          body: {
            input: 'roadmap',
            filter: { status: 'open' },
            orderBy: 'summary',
            orderAsc: true,
            rootOnly: true,
          },
        })
        .reply(200, {
          hits: 1,
          pages: 1,
          values: [
            createEntityApiRecordFixture({
              id: 'GOAL-1',
              entityType: 'goal',
              fields: { summary: 'Goal X' },
            }),
          ],
        });
    },
    outputDataSchema: FindEntitiesOutputDataSchema,
    assertData: (data) => {
      expect(data.entityType).toBe('goal');
      expect(data.count).toBe(1);
      expect(data.entities).toHaveLength(1);
      // С-3 (регрессия «идентификатор потерялся при фильтрации», см. find_issues):
      // конкретный элемент проверяется поимённо, а не только длина массива.
      expect(data.entities[0]).toMatchObject({ id: 'GOAL-1', fields: { summary: 'Goal X' } });
    },
  },

  invalidInput: {
    // fields обязателен (не optional) — FindEntitiesParamsSchema.
    input: { entityType: 'goal' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'post',
            path: '/v3/entities/goal/_search',
            apiVersion: 'v3',
            query: { perPage: 100, page: 1, fields: 'summary' },
            body: {},
          })
          .reply(403, generateError403());
      },
      input: { entityType: 'goal', fields: ['fields.summary'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'post',
            path: '/v3/entities/goal/_search',
            apiVersion: 'v3',
            query: { perPage: 100, page: 1, fields: 'summary' },
            body: {},
          })
          .reply(404, generateError404());
      },
      input: { entityType: 'goal', fields: ['fields.summary'] },
    },
  },

  // Единственная POST /_search на список — batch-режима у find_entities нет.
  batch: 'not-applicable',

  pagination: {
    type: 'offset',
    fullPage: {
      input: { entityType: 'goal', perPage: 2, fields: ['fields.summary'] },
      arrange: (api) => {
        api
          .expectRequest({
            method: 'post',
            path: '/v3/entities/goal/_search',
            apiVersion: 'v3',
            query: { perPage: 2, page: 1, fields: 'summary' },
            body: {},
          })
          .reply(200, {
            hits: 5,
            pages: 3,
            values: [
              createEntityApiRecordFixture({ id: 'GOAL-1', entityType: 'goal' }),
              createEntityApiRecordFixture({ id: 'GOAL-2', entityType: 'goal' }),
            ],
          });
      },
    },
    partialPage: {
      input: { entityType: 'goal', perPage: 2, fields: ['fields.summary'] },
      arrange: (api) => {
        api
          .expectRequest({
            method: 'post',
            path: '/v3/entities/goal/_search',
            apiVersion: 'v3',
            query: { perPage: 2, page: 1, fields: 'summary' },
            body: {},
          })
          .reply(200, {
            hits: 1,
            pages: 1,
            values: [createEntityApiRecordFixture({ id: 'GOAL-1', entityType: 'goal' })],
          });
      },
    },
  },

  warnings: {
    // "fields.priority" — допущение: см. комментарий в create-entity об
    // отсутствии документированного набора полей goal кроме `summary`.
    // Легитимное имя, просто не заполненное в ЭТОМ ответе.
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/entities/goal/_search',
          apiVersion: 'v3',
          query: { perPage: 100, page: 1, fields: 'summary,priority' },
          body: {},
        })
        .reply(200, {
          hits: 1,
          pages: 1,
          values: [
            createEntityApiRecordFixture({
              id: 'GOAL-1',
              entityType: 'goal',
              fields: { summary: 'Goal X' },
            }),
          ],
        });
    },
    input: { entityType: 'goal', fields: ['fields.summary', 'fields.priority'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe(`${FIND_ENTITIES_TOOL_METADATA.name} — неизвестное имя поля в проекции`, () => {
  const ctx = useToolIntegrationContext();

  it('несуществующее имя в "fields.<name>" API отклоняет явной 422, а не тихим 200', async () => {
    // Наблюдённый факт живой пробой (докблок `entity-api-fields.util.ts`): 200 с
    // пустым значением на таком входе недостижим — API отвечает 422.
    ctx.api
      .expectRequest({
        method: 'post',
        path: '/v3/entities/goal/_search',
        apiVersion: 'v3',
        query: { perPage: 100, page: 1, fields: 'summary,unknownField' },
        body: {},
      })
      .reply(422, {
        statusCode: 422,
        errorMessages: ['Field(s) [unknownField] do not exist'],
        errors: {},
      });

    const result = await ctx.client.callTool(FIND_ENTITIES_TOOL_METADATA.name, {
      entityType: 'goal',
      fields: ['fields.summary', 'fields.unknownField'],
    });

    expect(result.isError).toBe(true);
    assertContractualError(result, 422);
  });
});

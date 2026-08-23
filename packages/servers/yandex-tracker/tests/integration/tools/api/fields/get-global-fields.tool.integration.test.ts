/**
 * Интеграционный тест `get_global_fields` на фабрике `describeToolIntegration`.
 *
 * Категория `api/fields` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — С-4 здесь `мок (гипотеза)`.
 *
 * Сверка с внешним источником истины: референсный клиент (`Fields.path =
 * '/{api_version}/fields/{id}'`, `get_all()` без `id` → `GET`, `api_version` по
 * умолчанию `v2`) подтверждает `GET /v2/fields`. Официальная документация
 * (`https://yandex.ru/support/tracker/ru/api-ref/issues/get-global-fields.md`,
 * дословно `GET /v3/fields`) называет ту же операцию версией `v3`, а не `v2` —
 * прямое расхождение с приоритетным источником (документация первична по правилу
 * `tests/TESTING_STRATEGY.md` §2), записано в отчёт пакета как гипотеза этапа 3.1.
 *
 * `GET /v2/fields` не пагинируется (комментарий `get-global-fields.schema.ts`,
 * `get-fields.operation.ts`) — отдаёт все поля разом, аналогично
 * `get_statuses`/`get_priorities`.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createGlobalFieldFixture } from '#helpers/global-fields.fixture.js';
import { GET_GLOBAL_FIELDS_TOOL_METADATA } from '#tools/api/fields/get-global-fields.metadata.js';
import { GetGlobalFieldsOutputDataSchema } from '#tools/api/fields/get-global-fields.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
  assertNoWarnings,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: GET_GLOBAL_FIELDS_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v2/fields', apiVersion: 'v2' }],

  happyPath: {
    input: { fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v2/fields', apiVersion: 'v2' })
        .reply(200, [
          createGlobalFieldFixture({ id: 'summary', name: 'Summary' }),
          createGlobalFieldFixture({ id: 'customField123', name: 'Custom Priority' }),
        ]);
    },
    outputDataSchema: GetGlobalFieldsOutputDataSchema,
    assertData: (data) => {
      expect(data.count).toBe(2);
      expect(data.globalFields).toHaveLength(2);
      // Оба элемента поимённо (id + отфильтрованное поле name), а не только
      // длина массива — С-3, регрессия «идентификатор потерялся при фильтрации»,
      // уже случалась в find_issues (см. tests/TESTING_STRATEGY.md §3).
      expect(data.globalFields[0]).toMatchObject({ id: 'summary', name: 'Summary' });
      expect(data.globalFields[1]).toMatchObject({ id: 'customField123', name: 'Custom Priority' });
    },
  },

  invalidInput: {
    // `fields` обязателен и не может быть пустым массивом — FieldsSchema.
    input: { fields: [] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v2/fields', apiVersion: 'v2' })
          .reply(403, generateError403());
      },
      input: { fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов get_global_fields — GET /v2/fields; тот же
      // эндпоинт, отвечающий 404 (например, при недоступности организации).
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v2/fields', apiVersion: 'v2' })
          .reply(404, generateError404());
      },
      input: { fields: ['id'] },
    },
  },

  // Список без батч-режима — на вход один набор параметров, не массив запросов.
  batch: 'not-applicable',

  // GET /v2/fields не пагинируется — отдаёт все поля разом (см. схему инструмента).
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v2/fields', apiVersion: 'v2' })
        .reply(200, [createGlobalFieldFixture({ id: 'customField123', name: 'Custom Priority' })]);
    },
    input: { fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('get_global_fields — организация без глобальных полей (пустой список)', () => {
  const ctx = useToolIntegrationContext();

  it('API возвращает [] ⇒ count:0, пустая проекция, без warnings', async () => {
    ctx.api.expectRequest({ method: 'get', path: '/v2/fields', apiVersion: 'v2' }).reply(200, []);

    const result = await ctx.client.callTool(GET_GLOBAL_FIELDS_TOOL_METADATA.name, {
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, GetGlobalFieldsOutputDataSchema);
    expect(data.count).toBe(0);
    expect(data.globalFields).toHaveLength(0);
    assertNoWarnings(result);
    ctx.api.assertAllExpectationsMet();
  });
});

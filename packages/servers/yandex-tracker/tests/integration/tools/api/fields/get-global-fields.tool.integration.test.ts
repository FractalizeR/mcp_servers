/**
 * Интеграционный тест `get_global_fields` на фабрике `describeToolIntegration`.
 *
 * Живьём инструменты глобальных полей не наблюдались (реестр
 * `tests/coverage-exceptions/live-observations.ts`) — С-4 здесь `мок (гипотеза)`.
 *
 * Путь — `GET /v3/fields` (миграция 4.1, `.agentic-planning/plan_tracker_test_coverage/
 * 4.1_v3_migration_parallel.md`): документация (`https://yandex.ru/support/tracker/ru/
 * api-ref/issues/get-global-fields.md`) описывает только v3, боевая проба 2026-08-23
 * подтвердила идентичную форму ответа (72 = 72 элемента, тот же набор ключей) —
 * `inventory/v2-paths-2026-08-24.md`.
 *
 * `GET /v3/fields` не пагинируется (комментарий `get-global-fields.schema.ts`,
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

  expectedRequests: [{ method: 'get', path: '/v3/fields', apiVersion: 'v3' }],

  happyPath: {
    input: { fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' })
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
          .expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов get_global_fields — GET /v3/fields; тот же
      // эндпоинт, отвечающий 404 (например, при недоступности организации).
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { fields: ['id'] },
    },
  },

  // Список без батч-режима — на вход один набор параметров, не массив запросов.
  batch: 'not-applicable',

  // GET /v3/fields не пагинируется — отдаёт все поля разом (см. схему инструмента).
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' })
        .reply(200, [createGlobalFieldFixture({ id: 'customField123', name: 'Custom Priority' })]);
    },
    input: { fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('get_global_fields — организация без глобальных полей (пустой список)', () => {
  const ctx = useToolIntegrationContext();

  it('API возвращает [] ⇒ count:0, пустая проекция, без warnings', async () => {
    ctx.api.expectRequest({ method: 'get', path: '/v3/fields', apiVersion: 'v3' }).reply(200, []);

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

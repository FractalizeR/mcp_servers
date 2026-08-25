/**
 * Категория `filters` целиком в реестре исключений живых прогонов
 * (`tests/TESTING_STRATEGY.md` §1 — сохранённые фильтры видны за пределами
 * очереди `TEST`): мок — единственная проверка, С-4 в матрице — `мок (гипотеза)`.
 *
 * `POST /v3/filters/` сверен с официальной документацией Яндекс.Трекера
 * (api-ref/filters/create-filter) — путь и метод совпадают дословно, включая
 * завершающий слэш (`tests/TESTING_STRATEGY.md` §2). `ApiExpectationSet`
 * сравнивает путь точно, без нормализации.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createFilterFixture } from '#helpers/filters.fixture.js';
import { CREATE_FILTER_TOOL_METADATA } from '#tools/api/filters/create-filter.metadata.js';
import { CreateFilterOutputDataSchema } from '#tools/api/filters/create-filter.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: CREATE_FILTER_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v3/filters/', apiVersion: 'v3' }],

  happyPath: {
    input: {
      name: 'My Filter',
      filter: { queue: 'TEST' },
      fields: ['id', 'name'],
    },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/filters/',
          apiVersion: 'v3',
          body: { name: 'My Filter', filter: { queue: 'TEST' } },
        })
        .reply(200, createFilterFixture({ id: '1', name: 'My Filter' }));
    },
    outputDataSchema: CreateFilterOutputDataSchema,
    assertData: (data) => {
      expect(data.filter).toMatchObject({ id: '1', name: 'My Filter' });
      expect(data.message).toContain('My Filter');
    },
  },

  invalidInput: {
    // `fields` обязателен (не optional) — CreateFilterParamsSchema, FieldsSchema.
    input: { name: 'Filter without fields' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/filters/', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { name: 'Restricted Filter', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов create_filter — POST /v3/filters/; 404 здесь та
      // же операция, отвечающая отказом (контрактная форма отказа не зависит
      // от домена — проверяется маппинг статуса, а не реалистичность причины).
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/filters/', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { name: 'Filter for missing target', fields: ['id'] },
    },
  },

  // create_filter — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Создание фильтра не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // Ответ (`createFilterFixture`) содержит только `id`/`self`/`name` —
    // запрошенное поле "missingField" в нём отсутствует, ResponseFieldFilter
    // отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1). `groupBy` тут ни при чём:
    // это входной параметр схемы инструмента, а не контейнер ответа API.
    arrange: (api) => {
      api
        .expectRequest({ method: 'post', path: '/v3/filters/', apiVersion: 'v3' })
        .reply(200, createFilterFixture({ id: '2', name: 'Filter With Gaps' }));
    },
    input: { name: 'Filter With Gaps', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

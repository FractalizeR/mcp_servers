/**
 * С-4/С-5 у `update_filter` в матрице — `живьём`: реестр
 * (`tests/coverage-exceptions/live-observations.ts`) несёт запись по прогону
 * `sweep7-2026-08-26` — фильтр `7` переименован, прямое чтение подтверждает. Клетку производит реестр, а не этот
 * тест: он стоит на моке и свидетельствует лишь совпадение запроса с нашим
 * представлением об API (`tests/TESTING_STRATEGY.md` §1, канон §2).
 *
 * `PATCH /v3/filters/{id}` сверен с официальной документацией Яндекс.Трекера
 * (api-ref/filters/update-filter) — путь, метод и версия совпадают дословно;
 * без завершающего слэша (в отличие от create_filter — id подставлен, а не
 * пуст, см. `tests/TESTING_STRATEGY.md` §2).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createFilterFixture } from '#helpers/filters.fixture.js';
import { UPDATE_FILTER_TOOL_METADATA } from '#tools/api/filters/update-filter.metadata.js';
import { UpdateFilterOutputDataSchema } from '#tools/api/filters/update-filter.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: UPDATE_FILTER_TOOL_METADATA.name,

  expectedRequests: [{ method: 'patch', path: '/v3/filters/10', apiVersion: 'v3' }],

  happyPath: {
    input: { filterId: '10', name: 'Updated Filter', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/filters/10',
          apiVersion: 'v3',
          body: { name: 'Updated Filter' },
        })
        .reply(200, createFilterFixture({ id: '10', name: 'Updated Filter' }));
    },
    outputDataSchema: UpdateFilterOutputDataSchema,
    assertData: (data) => {
      expect(data.filter).toMatchObject({ id: '10', name: 'Updated Filter' });
    },
  },

  invalidInput: {
    // `fields` обязателен (не optional) — UpdateFilterParamsSchema, FieldsSchema.
    input: { filterId: '10', name: 'Filter without fields' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: '/v3/filters/10', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { filterId: '10', name: 'Restricted Update', fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: '/v3/filters/10', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { filterId: '10', name: 'Missing Filter', fields: ['id'] },
    },
  },

  // update_filter — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Обновление фильтра не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // Ответ (`createFilterFixture`) содержит только `id`/`self`/`name` —
    // запрошенное поле "missingField" в нём отсутствует, ResponseFieldFilter
    // отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1). `groupBy` тут ни при чём:
    // это входной параметр схемы инструмента, а не контейнер ответа API.
    arrange: (api) => {
      api
        .expectRequest({ method: 'patch', path: '/v3/filters/10', apiVersion: 'v3' })
        .reply(200, createFilterFixture({ id: '10', name: 'Filter With Gaps' }));
    },
    input: { filterId: '10', name: 'Filter With Gaps', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

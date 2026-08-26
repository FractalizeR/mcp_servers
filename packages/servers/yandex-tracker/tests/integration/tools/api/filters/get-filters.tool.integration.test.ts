/**
 * Записи в реестре живых наблюдений (`tests/coverage-exceptions/live-observations.ts`)
 * у `get_filters` нет — С-4 в матрице `мок (гипотеза)`. Категорийного «живьём не
 * наблюдается никогда» больше нет вовсе: `tests/TESTING_STRATEGY.md` §1 — источник
 * ПРИЧИНЫ (песочница, допуск по владению прогоном), реестр — источник СПИСКА.
 *
 * `GET /v3/myself/favorites/filters` — эндпоинт по аналогии (см. комментарий в
 * `get-filters.operation.ts`): не документирован официально (страница
 * `api-ref/filters/*` для списка/избранного фильтров не найдена — проверено
 * прямым запросом), взят из явного метода референсного клиента
 * `Filters.get_favorites()` (`yandex_tracker_client/collections.py`), а НЕ из
 * общей механики `Collection.get_all()`, как предполагал прежний комментарий в
 * операции — путь там жёстко прописан отдельным методом, а не собран из
 * `{api_version}/filters/{id}` с пустым id. Путь и метод (`GET`) совпадают
 * буквально; версия API (`v3`) референсным клиентом не зафиксирована — там она
 * параметр соединения, а не константа коллекции — остаётся гипотезой этапа 3.1.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createFilterFixture } from '#helpers/filters.fixture.js';
import { GET_FILTERS_TOOL_METADATA } from '#tools/api/filters/get-filters.metadata.js';
import { GetFiltersOutputDataSchema } from '#tools/api/filters/get-filters.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
  assertNoWarnings,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: GET_FILTERS_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v3/myself/favorites/filters', apiVersion: 'v3' }],

  happyPath: {
    input: { fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'get',
          path: '/v3/myself/favorites/filters',
          apiVersion: 'v3',
        })
        .reply(200, [
          createFilterFixture({ id: '1', name: 'Favorite One' }),
          createFilterFixture({ id: '2', name: 'Favorite Two' }),
        ]);
    },
    outputDataSchema: GetFiltersOutputDataSchema,
    assertData: (data) => {
      expect(data.count).toBe(2);
      expect(data.filters).toHaveLength(2);
      // Идентификатор + отфильтрованное поле поимённо (С-3, регрессия
      // класса «идентификатор потерялся при фильтрации», уже случалась в
      // find_issues) — одних count/toHaveLength мало, они не отличают
      // корректную проекцию от повреждённой.
      expect(data.filters[0]).toMatchObject({ id: '1', name: 'Favorite One' });
      expect(data.filters[1]).toMatchObject({ id: '2', name: 'Favorite Two' });
    },
  },

  invalidInput: {
    // `fields` обязателен (не optional) — GetFiltersParamsSchema, FieldsSchema.
    input: {},
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'get',
            path: '/v3/myself/favorites/filters',
            apiVersion: 'v3',
          })
          .reply(403, generateError403());
      },
      input: { fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'get',
            path: '/v3/myself/favorites/filters',
            apiVersion: 'v3',
          })
          .reply(404, generateError404());
      },
      input: { fields: ['id'] },
    },
  },

  // get_filters — список без batch-режима (нет частично успешных элементов).
  batch: 'not-applicable',

  // Не пагинируется (личный набор избранных фильтров невелик, аналогично
  // get_components/get_boards) — GetFiltersOutputDataSchema без поля
  // "pagination" (get-filters.schema.ts). Фабрика допускает эту декларацию
  // только когда outputDataSchema не содержит "pagination" вовсе, поэтому
  // фактическое поведение эндпоинта на `Link rel="next"` зафиксировано
  // отдельным `it()` ниже, а не через встроенный блок `pagination`.
  pagination: 'none',

  warnings: {
    // Второй элемент не содержит запрошенное поле "missingField" —
    // ResponseFieldFilter отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({
          method: 'get',
          path: '/v3/myself/favorites/filters',
          apiVersion: 'v3',
        })
        .reply(200, [createFilterFixture({ id: '3', name: 'Filter With Gaps' })]);
    },
    input: { fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('get_filters — за пределами обязательного состава фабрики (Link-мета, пустой список)', () => {
  const ctx = useToolIntegrationContext();

  it(
    'ответ с Link rel="next" всё равно отдаёт только первую страницу без ' +
      'сигнала об остатке — GetFiltersTool читает `result.items` из ' +
      '`TrackerPaginator.singlePage` (get-filters.operation.ts) и отбрасывает ' +
      '`result.pagination` целиком (get-filters.tool.ts); GetFiltersOutputDataSchema ' +
      'без поля "pagination" (get-filters.schema.ts) — сигнала "есть ещё" в ответе ' +
      'физически нет. Зафиксировано как факт, не чинится этим набором файлов (границы задания)',
    async () => {
      ctx.api
        .expectRequest({
          method: 'get',
          path: '/v3/myself/favorites/filters',
          apiVersion: 'v3',
        })
        .reply(200, [createFilterFixture({ id: '1', name: 'Favorite One' })], {
          link: '<https://api.tracker.yandex.net/v3/myself/favorites/filters?page=2>; rel="next"',
        });

      const result = await ctx.client.callTool(GET_FILTERS_TOOL_METADATA.name, {
        fields: ['id', 'name'],
      });

      expect(result.isError).toBeUndefined();
      const data = assertMatchesOutputSchema(result, GetFiltersOutputDataSchema);
      expect(data.count).toBe(1);
      expect(data.filters).toHaveLength(1);
      expect(Object.keys(data)).not.toContain('pagination');
      ctx.api.assertAllExpectationsMet();
    }
  );

  it('пустой список избранных фильтров — count 0, без warnings (нет избранных — обычная ветка)', async () => {
    ctx.api
      .expectRequest({
        method: 'get',
        path: '/v3/myself/favorites/filters',
        apiVersion: 'v3',
      })
      .reply(200, []);

    const result = await ctx.client.callTool(GET_FILTERS_TOOL_METADATA.name, {
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, GetFiltersOutputDataSchema);
    expect(data.count).toBe(0);
    expect(data.filters).toEqual([]);
    assertNoWarnings(result);
    ctx.api.assertAllExpectationsMet();
  });
});

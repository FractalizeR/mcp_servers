/**
 * С-4/С-5 у `update_board_column` в матрице — `живьём`: реестр
 * (`tests/coverage-exceptions/live-observations.ts`) несёт запись по прогону
 * `sweep-2026-08-25` — колонка `1` доски `106`, выставлен `limit: 5`, чтение
 * подтверждает. Этот тест стоит на моке и маршрут не свидетельствует; ниже — на что
 * опиралось наше представление об API до живой пробы:
 * см. расхождение версии в `delete-board-column.tool.integration.test.ts`
 * (та же аномалия `tests/TESTING_STRATEGY.md` §2) — путь без завершающего слэша,
 * как и у `Collection.update()` референсного клиента (`obj._path`, без слэша).
 *
 * D11 (`0_CONTRACTS.md`): `id` колонки не уникален внутри доски, поэтому перед
 * PATCH инструмент сперва читает `GET /v3/boards/{id}/columns` и проверяет
 * адресацию (`board-column-addressing.util.ts`) — отсюда GET перед PATCH в
 * каждом сценарии ниже. `errors.notFound` здесь — не про проверку адресации
 * (тот случай — отдельный `describe()` ниже), а про гонку: колонка была на
 * доске в момент GET, но API отдал 404 на сам PATCH.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createBoardColumnFixture } from '#helpers/board-columns.fixture.js';
import { UPDATE_BOARD_COLUMN_TOOL_METADATA } from '#tools/api/boards/update-board-column.metadata.js';
import { UpdateBoardColumnOutputDataSchema } from '#tools/api/boards/update-board-column.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
} from '#integration/helpers/tool-integration-suite.js';
import { getTextContent } from '#helpers/tool-result.helper.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: UPDATE_BOARD_COLUMN_TOOL_METADATA.name,

  expectedRequests: [
    { method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' },
    { method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' },
  ],

  happyPath: {
    input: { boardId: '42', columnId: '7', name: 'Renamed Column', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
        .reply(200, [createBoardColumnFixture({ id: 7, name: 'Old Name' })]);
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/boards/42/columns/7',
          apiVersion: 'v3',
          body: { name: 'Renamed Column' },
        })
        .reply(200, createBoardColumnFixture({ id: 7, name: 'Renamed Column' }));
    },
    outputDataSchema: UpdateBoardColumnOutputDataSchema,
    assertData: (data) => {
      expect(data.column).toMatchObject({ id: 7, name: 'Renamed Column' });
    },
  },

  invalidInput: {
    // fields обязателен (не optional) — UpdateBoardColumnParamsSchema, FieldsSchema.
    input: { boardId: '42', columnId: '7', name: 'Column without fields' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
          .reply(200, [createBoardColumnFixture({ id: 7, name: 'Restricted' })]);
        api
          .expectRequest({ method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { boardId: '42', columnId: '7', name: 'Restricted rename', fields: ['id'] },
    },
    notFound: {
      // Тот же boardId/columnId, что и в happyPath/forbidden — expectedRequests
      // декларирует конкретный путь один раз (H-1). Колонка есть на GET (проверка
      // адресации проходит), но PATCH отдаёт 404 — гонка, а не неадресуемость.
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
          .reply(200, [createBoardColumnFixture({ id: 7, name: 'About to vanish' })]);
        api
          .expectRequest({ method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { boardId: '42', columnId: '7', name: 'Missing column', fields: ['id'] },
    },
  },

  // update_board_column — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Обновление колонки не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
        .reply(200, [createBoardColumnFixture({ id: 7, name: 'Old Name' })]);
      api
        .expectRequest({ method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
        .reply(200, createBoardColumnFixture({ id: 7, name: 'Column With Gaps' }));
    },
    input: {
      boardId: '42',
      columnId: '7',
      name: 'Column With Gaps',
      fields: ['id', 'name', 'missingField'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe(`${UPDATE_BOARD_COLUMN_TOOL_METADATA.name} — неоднозначная адресация columnId (D11)`, () => {
  const ctx = useToolIntegrationContext();

  it('отказывает без PATCH, если на доске несколько колонок с этим id', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
      .reply(200, [
        createBoardColumnFixture({ id: 7, name: 'Открыт' }),
        createBoardColumnFixture({ id: 7, name: 'Новая колонка' }),
      ]);

    const result = await ctx.client.callTool(UPDATE_BOARD_COLUMN_TOOL_METADATA.name, {
      boardId: '42',
      columnId: '7',
      name: 'Renamed',
      fields: ['id'],
    });

    expect(result.isError).toBe(true);
    const text = getTextContent(result);
    expect(text).toContain('адресована неоднозначно');
    expect(text).toContain('Открыт');
    expect(text).toContain('Новая колонка');
    ctx.api.assertAllExpectationsMet();
  });

  it('отказывает без PATCH, если на доске нет колонки с этим id', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
      .reply(200, [createBoardColumnFixture({ id: 9, name: 'Другая колонка' })]);

    const result = await ctx.client.callTool(UPDATE_BOARD_COLUMN_TOOL_METADATA.name, {
      boardId: '42',
      columnId: '7',
      name: 'Renamed',
      fields: ['id'],
    });

    expect(result.isError).toBe(true);
    const text = getTextContent(result);
    expect(text).toContain('Колонка 7 доски 42 не найдена');
    ctx.api.assertAllExpectationsMet();
  });
});

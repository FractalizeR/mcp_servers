/**
 * Живьём инструменты досок наблюдаются потульно, по реестру
 * (`tests/coverage-exceptions/live-observations.ts`) — колонки доски видны за
 * пределами очереди `TEST` (`tests/TESTING_STRATEGY.md` §1). С-4 здесь
 * `мок (гипотеза)`: см. расхождение версии в `delete-board-column.tool.integration.test.ts`
 * (та же аномалия `tests/TESTING_STRATEGY.md` §2) — путь без завершающего слэша
 * при листинге, как и `Collection.get_all()` референсного клиента.
 *
 * `id` в фикстурах ниже — ЧИСЛО (см. докблок `#helpers/board-columns.fixture.js`):
 * документированная wire-форма API расходится с локальной entity `BoardColumn`
 * (`id: string`) — намеренно не маскируется под неверный тип.
 */

import { createBoardColumnFixture } from '#helpers/board-columns.fixture.js';
import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { GET_BOARD_COLUMNS_TOOL_METADATA } from '#tools/api/boards/get-board-columns.metadata.js';
import { GetBoardColumnsOutputDataSchema } from '#tools/api/boards/get-board-columns.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
  assertNoWarnings,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: GET_BOARD_COLUMNS_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' }],

  happyPath: {
    input: { boardId: '42', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
        .reply(200, [
          createBoardColumnFixture({ id: 1, name: 'Open' }),
          createBoardColumnFixture({ id: 2, name: 'Done' }),
        ]);
    },
    outputDataSchema: GetBoardColumnsOutputDataSchema,
    assertData: (data) => {
      expect(data.boardId).toBe('42');
      expect(data.count).toBe(2);
      expect(data.columns).toEqual([
        { id: 1, name: 'Open' },
        { id: 2, name: 'Done' },
      ]);
    },
  },

  invalidInput: {
    // boardId не может быть пустым (`GetBoardColumnsParamsSchema`).
    input: { boardId: '', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { boardId: '42', fields: ['id'] },
    },
    notFound: {
      // Тот же boardId, что и в happyPath/forbidden — expectedRequests декларирует
      // конкретный путь один раз (H-1).
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { boardId: '42', fields: ['id'] },
    },
  },

  // get_board_columns — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Эндпоинт не пагинируется — небольшой набор колонок доски
  // (`get-board-columns.schema.ts`: «ВАЖНО: эндпоинт не пагинируется»).
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
        .reply(200, [createBoardColumnFixture({ id: 1, name: 'Open' })]);
    },
    input: { boardId: '42', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('get_board_columns — кейсы вне обязательного состава фабрики', () => {
  const ctx = useToolIntegrationContext();

  it('доска без колонок: пустой массив, count=0, warnings отсутствует', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
      .reply(200, []);

    const result = await ctx.client.callTool(GET_BOARD_COLUMNS_TOOL_METADATA.name, {
      boardId: '42',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, GetBoardColumnsOutputDataSchema);
    expect(data.columns).toEqual([]);
    expect(data.count).toBe(0);
    expect(data.boardId).toBe('42');
    assertNoWarnings(result);
    ctx.api.assertAllExpectationsMet();
  });

  /**
   * `GetBoardColumnsOperation` шлёт `getWithResponse` и прогоняет ответ через
   * `TrackerPaginator.singlePage` (`get-board-columns.operation.ts`), который
   * безусловно читает заголовок `Link` и строит `PaginationMeta` c
   * `hasNextPage` (`tracker-paginator.util.ts`, `buildMeta`) — независимо от
   * того, передан ли `tag`. `GetBoardColumnsTool.execute` (`get-board-columns.tool.ts`)
   * забирает из результата операции только `result.items`, `result.pagination`
   * нигде не используется и не попадает в ответ инструмента: в коде нет
   * комментария, объясняющего это как сознательное решение — выглядит как
   * недосмотр (операция скопирована с паджинируемого эндпоинта), а не как
   * подтверждённая политика «мета неприменима». Раз колонки бывают
   * возвращены с `Link rel="next"` (гипотетически — реального прогона против
   * доски с сотнями колонок не было), а инструмент объявляет `pagination:
   * 'none'` в схеме, `hasNextPage=true`, посчитанный операцией, теряется молча.
   * Это КЛАСС дефекта §3 канона (`tests/TESTING_STRATEGY.md`): «эндпоинт не
   * пагинируется» неотличимо от «пагинируется, а мы отдаём только первую
   * страницу». Фиксирую факт как есть — маскировать подгонкой мока под
   * ожидание «Link нет» нельзя.
   */
  it('Link rel="next" в ответе API есть, но инструмент отдаёт только items — pagination-мета теряется молча', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
      .reply(200, [createBoardColumnFixture({ id: 1, name: 'Open' })], {
        link: '<https://api.tracker.yandex.net/v3/boards/42/columns?page=2>; rel="next"',
      });

    const result = await ctx.client.callTool(GET_BOARD_COLUMNS_TOOL_METADATA.name, {
      boardId: '42',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, GetBoardColumnsOutputDataSchema);
    // GetBoardColumnsOutputDataSchema не объявляет "pagination" вовсе — поле
    // физически не может дойти до ответа, хотя `TrackerPaginator.singlePage`
    // уже посчитал `hasNextPage=true` из этого же `Link` внутри операции.
    expect(data).not.toHaveProperty('pagination');
    expect(data.columns).toEqual([{ id: 1, name: 'Open' }]);
    ctx.api.assertAllExpectationsMet();
  });
});

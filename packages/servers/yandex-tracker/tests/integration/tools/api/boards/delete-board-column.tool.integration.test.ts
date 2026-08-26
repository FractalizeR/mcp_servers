/**
 * Живьём инструменты досок наблюдаются потульно, по реестру
 * (`tests/coverage-exceptions/live-observations.ts`) — колонка доски видна за
 * пределами очереди `TEST` (`tests/TESTING_STRATEGY.md` §1). С-4 здесь
 * `мок (гипотеза)`: `yandex_tracker_client/` определяет `BoardColumns` как
 * generic-коллекцию (`path = '/{api_version}/boards/{board}/columns/{id}'`,
 * `Collection.delete()` → `DELETE`) с дефолтной версией `VERSION_V2` — сервер
 * реально ходит в `/v3/...`; submodule эту версию не подтверждает (параметр
 * соединения), путь и метод — да. См. отчёт P1.
 *
 * D11 (`0_CONTRACTS.md`): `id` колонки не уникален внутри доски — на боевой
 * доске DELETE по неоднозначному id снёс сразу обе колонки с этим id. Перед
 * DELETE инструмент сперва читает `GET /v3/boards/{id}/columns` и проверяет
 * адресацию (`board-column-addressing.util.ts`) — отсюда GET перед DELETE в
 * каждом сценарии ниже. `errors.notFound` здесь — не про проверку адресации
 * (тот случай — отдельный `describe()` ниже), а про гонку: колонка была на
 * доске в момент GET, но API отдал 404 на сам DELETE.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createBoardColumnFixture } from '#helpers/board-columns.fixture.js';
import { DELETE_BOARD_COLUMN_TOOL_METADATA } from '#tools/api/boards/delete-board-column.metadata.js';
import { DeleteBoardColumnOutputDataSchema } from '#tools/api/boards/delete-board-column.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
} from '#integration/helpers/tool-integration-suite.js';
import { getTextContent } from '#helpers/tool-result.helper.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: DELETE_BOARD_COLUMN_TOOL_METADATA.name,

  expectedRequests: [
    { method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' },
    { method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' },
  ],

  happyPath: {
    input: { boardId: '42', columnId: '7' },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
        .reply(200, [createBoardColumnFixture({ id: 7, name: 'To Delete' })]);
      api
        .expectRequest({ method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
        .reply(200);
    },
    outputDataSchema: DeleteBoardColumnOutputDataSchema,
    assertData: (data) => {
      expect(data).toMatchObject({ success: true, boardId: '42', columnId: '7' });
      expect(data.message).toContain('7');
    },
  },

  invalidInput: {
    // columnId не может быть пустым (`DeleteBoardColumnParamsSchema`).
    input: { boardId: '42', columnId: '' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
          .reply(200, [createBoardColumnFixture({ id: 7, name: 'Restricted' })]);
        api
          .expectRequest({ method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { boardId: '42', columnId: '7' },
    },
    notFound: {
      // Тот же boardId/columnId, что и в happyPath/forbidden — expectedRequests
      // декларирует конкретный путь один раз (H-1). Колонка есть на GET (проверка
      // адресации проходит), но DELETE отдаёт 404 — гонка, а не неадресуемость.
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
          .reply(200, [createBoardColumnFixture({ id: 7, name: 'About to vanish' })]);
        api
          .expectRequest({ method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { boardId: '42', columnId: '7' },
    },
  },

  // delete_board_column — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Удаление колонки не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  // Ответ не содержит FilteredEntitySchema — FIELDS_WITHOUT_VALUE недостижим.
  warnings: 'not-applicable',
});

describe(`${DELETE_BOARD_COLUMN_TOOL_METADATA.name} — неоднозначная адресация columnId (D11)`, () => {
  const ctx = useToolIntegrationContext();

  it('отказывает без DELETE, если на доске несколько колонок с этим id (иначе снесло бы обе)', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
      .reply(200, [
        createBoardColumnFixture({ id: 7, name: 'Открыт' }),
        createBoardColumnFixture({ id: 7, name: 'Новая колонка' }),
      ]);

    const result = await ctx.client.callTool(DELETE_BOARD_COLUMN_TOOL_METADATA.name, {
      boardId: '42',
      columnId: '7',
    });

    expect(result.isError).toBe(true);
    const text = getTextContent(result);
    expect(text).toContain('адресована неоднозначно');
    expect(text).toContain('Открыт');
    expect(text).toContain('Новая колонка');
    ctx.api.assertAllExpectationsMet();
  });

  it('отказывает без DELETE, если на доске нет колонки с этим id', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/boards/42/columns', apiVersion: 'v3' })
      .reply(200, [createBoardColumnFixture({ id: 9, name: 'Другая колонка' })]);

    const result = await ctx.client.callTool(DELETE_BOARD_COLUMN_TOOL_METADATA.name, {
      boardId: '42',
      columnId: '7',
    });

    expect(result.isError).toBe(true);
    const text = getTextContent(result);
    expect(text).toContain('Колонка 7 доски 42 не найдена');
    ctx.api.assertAllExpectationsMet();
  });
});

/**
 * `boards` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — доска видна за
 * пределами очереди `TEST` (`tests/TESTING_STRATEGY.md` §1). С-4 здесь
 * `мок (гипотеза)`: путь и метод сверены с внешним источником — референсным
 * клиентом `yandex_tracker_client/` (`Boards.path = '/{api_version}/boards/{id}'`,
 * `Collection.get_all()` → `GET`) с дефолтной версией соединения `VERSION_V2` —
 * совпадает с `/v2/boards/{boardId}`.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createBoardFixture } from '#helpers/agile.fixture.js';
import { GET_BOARD_TOOL_METADATA } from '#tools/api/boards/get-board.metadata.js';
import { GetBoardOutputDataSchema } from '#tools/api/boards/get-board.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: GET_BOARD_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v2/boards/42', apiVersion: 'v2' }],

  happyPath: {
    input: { boardId: '42', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v2/boards/42', apiVersion: 'v2' })
        .reply(200, createBoardFixture({ id: '42', name: 'Test Board' }));
    },
    outputDataSchema: GetBoardOutputDataSchema,
    assertData: (data) => {
      expect(data.board).toMatchObject({ id: '42', name: 'Test Board' });
    },
  },

  invalidInput: {
    // boardId не может быть пустым (`GetBoardParamsSchema`).
    input: { boardId: '', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v2/boards/42', apiVersion: 'v2' })
          .reply(403, generateError403());
      },
      input: { boardId: '42', fields: ['id'] },
    },
    notFound: {
      // Тот же boardId, что и в happyPath/forbidden — expectedRequests декларирует
      // конкретный путь `/v2/boards/42` один раз (H-1).
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v2/boards/42', apiVersion: 'v2' })
          .reply(404, generateError404());
      },
      input: { boardId: '42', fields: ['id'] },
    },
  },

  // get_board — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Одна доска по ID — не list-эндпоинт, пагинация неприменима.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v2/boards/42', apiVersion: 'v2' })
        .reply(200, createBoardFixture({ id: '42', name: 'Test Board' }));
    },
    input: { boardId: '42', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('get_board — кейсы вне обязательного состава фабрики', () => {
  const ctx = useToolIntegrationContext();

  it('localized=false доходит до запроса явно (не путается с "параметр не передан")', async () => {
    // `GetBoardOperation` шлёт `localized` через `URLSearchParams` только когда
    // значение `!== undefined` (`get-board.operation.ts`) — `false` обязан уйти
    // в query буквально, а не быть неотличимым от отсутствия параметра.
    ctx.api
      .expectRequest({
        method: 'get',
        path: '/v2/boards/42',
        apiVersion: 'v2',
        query: { localized: false },
      })
      .reply(200, createBoardFixture({ id: '42', name: 'Test Board' }));

    const result = await ctx.client.callTool(GET_BOARD_TOOL_METADATA.name, {
      boardId: '42',
      fields: ['id', 'name'],
      localized: false,
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, GetBoardOutputDataSchema);
    expect(data.board).toMatchObject({ id: '42', name: 'Test Board' });
    ctx.api.assertAllExpectationsMet();
  });
});

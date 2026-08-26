/**
 * Живьём инструменты досок наблюдаются потульно, по реестру
 * (`tests/coverage-exceptions/live-observations.ts`) — доски видны за
 * пределами очереди `TEST` (`tests/TESTING_STRATEGY.md` §1). С-4 здесь
 * `мок (гипотеза)`: путь и метод сверены с внешним источником — референсным
 * клиентом `yandex_tracker_client/` (`Boards.path = '/{api_version}/boards/{id}'`,
 * `Collection.get_all()` → `GET`, `id` пуст для листинга) с дефолтной версией
 * соединения `VERSION_V2` — путь и метод подтверждены, версия — нет (submodule
 * её не различает); сервер реально ходит в `/v3/boards`.
 */

import { createBoardFixture } from '#helpers/agile.fixture.js';
import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { GET_BOARDS_TOOL_METADATA } from '#tools/api/boards/get-boards.metadata.js';
import { GetBoardsOutputDataSchema } from '#tools/api/boards/get-boards.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
  assertNoWarnings,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: GET_BOARDS_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v3/boards', apiVersion: 'v3' }],

  happyPath: {
    input: { fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
        .reply(200, [
          createBoardFixture({ id: 1, name: 'Board One' }),
          createBoardFixture({ id: 2, name: 'Board Two' }),
        ]);
    },
    outputDataSchema: GetBoardsOutputDataSchema,
    assertData: (data) => {
      expect(data.count).toBe(2);
      expect(data.boards).toEqual([
        { id: 1, name: 'Board One' },
        { id: 2, name: 'Board Two' },
      ]);
    },
  },

  invalidInput: {
    // fields обязателен (не optional) — GetBoardsParamsSchema, FieldsSchema.
    input: {},
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов get_boards — GET /v3/boards; 404 — гипотетическая
      // реакция API на несуществующий ресурс организации (список досок сам по
      // себе не адресует конкретную сущность, но контрактная ошибка проверяется
      // как маппинг любого статуса ответа операции).
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { fields: ['id'] },
    },
  },

  // get_boards — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Эндпоинт не пагинируется — API возвращает все доски одним ответом
  // (`get-boards.schema.ts`: «ВАЖНО: эндпоинт досок НЕ пагинируется»).
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' })
        .reply(200, [createBoardFixture({ id: 1, name: 'Board One' })]);
    },
    input: { fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('get_boards — кейсы вне обязательного состава фабрики', () => {
  const ctx = useToolIntegrationContext();

  it('организация без досок: пустой массив, count=0, warnings отсутствует', async () => {
    ctx.api.expectRequest({ method: 'get', path: '/v3/boards', apiVersion: 'v3' }).reply(200, []);

    const result = await ctx.client.callTool(GET_BOARDS_TOOL_METADATA.name, {
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, GetBoardsOutputDataSchema);
    expect(data.boards).toEqual([]);
    expect(data.count).toBe(0);
    assertNoWarnings(result);
    ctx.api.assertAllExpectationsMet();
  });

  it('localized=false доходит до запроса явно (не путается с "параметр не передан")', async () => {
    // `GetBoardsOperation` шлёт `localized` через `URLSearchParams` только когда
    // значение `!== undefined` (`get-boards.operation.ts`) — `false` обязан уйти
    // в query буквально, а не быть неотличимым от отсутствия параметра.
    ctx.api
      .expectRequest({
        method: 'get',
        path: '/v3/boards',
        apiVersion: 'v3',
        query: { localized: false },
      })
      .reply(200, [createBoardFixture({ id: 1, name: 'Board One' })]);

    const result = await ctx.client.callTool(GET_BOARDS_TOOL_METADATA.name, {
      fields: ['id', 'name'],
      localized: false,
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, GetBoardsOutputDataSchema);
    expect(data.count).toBe(1);
    ctx.api.assertAllExpectationsMet();
  });
});

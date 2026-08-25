/**
 * `boards` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — доска видна за
 * пределами очереди `TEST` (`tests/TESTING_STRATEGY.md` §1). С-4 здесь
 * `мок (гипотеза)`: путь и метод сверены с внешним источником — референсным
 * клиентом `yandex_tracker_client/` (`Boards.path = '/{api_version}/boards/{id}'`,
 * `Collection.update()` → `PATCH` при непустом `kwargs`) с дефолтной версией
 * соединения `VERSION_V2` — путь и метод подтверждены, версия — нет (submodule
 * её не различает); сервер реально ходит в `/v3/boards/{boardId}`.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createBoardFixture } from '#helpers/agile.fixture.js';
import { UPDATE_BOARD_TOOL_METADATA } from '#tools/api/boards/update-board.metadata.js';
import { UpdateBoardOutputDataSchema } from '#tools/api/boards/update-board.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: UPDATE_BOARD_TOOL_METADATA.name,

  expectedRequests: [{ method: 'patch', path: '/v3/boards/42', apiVersion: 'v3' }],

  happyPath: {
    input: { boardId: '42', name: 'Renamed Board', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/boards/42',
          apiVersion: 'v3',
          body: { name: 'Renamed Board' },
        })
        .reply(200, createBoardFixture({ id: 42, name: 'Renamed Board' }));
    },
    outputDataSchema: UpdateBoardOutputDataSchema,
    assertData: (data) => {
      expect(data.board).toMatchObject({ id: 42, name: 'Renamed Board' });
    },
  },

  invalidInput: {
    // fields обязателен (не optional) — UpdateBoardParamsSchema, FieldsSchema.
    input: { boardId: '42', name: 'Board without fields' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: '/v3/boards/42', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { boardId: '42', name: 'Restricted rename', fields: ['id'] },
    },
    notFound: {
      // Тот же boardId, что и в happyPath/forbidden — expectedRequests декларирует
      // конкретный путь `/v3/boards/42` один раз (H-1).
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: '/v3/boards/42', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { boardId: '42', name: 'Missing board', fields: ['id'] },
    },
  },

  // update_board — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Обновление доски не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'patch', path: '/v3/boards/42', apiVersion: 'v3' })
        .reply(200, createBoardFixture({ id: 42, name: 'Board With Gaps' }));
    },
    input: { boardId: '42', name: 'Board With Gaps', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

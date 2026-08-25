/**
 * `boards` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — колонка доски видна за
 * пределами очереди `TEST` (`tests/TESTING_STRATEGY.md` §1). С-4 здесь
 * `мок (гипотеза)`: см. расхождение версии в `delete-board-column.tool.integration.test.ts`
 * (та же аномалия `tests/TESTING_STRATEGY.md` §2) — путь без завершающего слэша,
 * как и у `Collection.update()` референсного клиента (`obj._path`, без слэша).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createBoardColumnFixture } from '#helpers/board-columns.fixture.js';
import { UPDATE_BOARD_COLUMN_TOOL_METADATA } from '#tools/api/boards/update-board-column.metadata.js';
import { UpdateBoardColumnOutputDataSchema } from '#tools/api/boards/update-board-column.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: UPDATE_BOARD_COLUMN_TOOL_METADATA.name,

  expectedRequests: [{ method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' }],

  happyPath: {
    input: { boardId: '42', columnId: '7', name: 'Renamed Column', fields: ['id', 'name'] },
    arrange: (api) => {
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
          .expectRequest({ method: 'patch', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { boardId: '42', columnId: '7', name: 'Restricted rename', fields: ['id'] },
    },
    notFound: {
      // Тот же boardId/columnId, что и в happyPath/forbidden — expectedRequests
      // декларирует конкретный путь один раз (H-1).
      arrange: (api) => {
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

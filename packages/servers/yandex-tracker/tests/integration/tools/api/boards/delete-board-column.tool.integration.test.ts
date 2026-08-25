/**
 * `boards` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — колонка доски видна за
 * пределами очереди `TEST` (`tests/TESTING_STRATEGY.md` §1). С-4 здесь
 * `мок (гипотеза)`: `yandex_tracker_client/` определяет `BoardColumns` как
 * generic-коллекцию (`path = '/{api_version}/boards/{board}/columns/{id}'`,
 * `Collection.delete()` → `DELETE`) с дефолтной версией `VERSION_V2` — сервер
 * реально ходит в `/v3/...`; submodule эту версию не подтверждает (параметр
 * соединения), путь и метод — да. См. отчёт P1.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { DELETE_BOARD_COLUMN_TOOL_METADATA } from '#tools/api/boards/delete-board-column.metadata.js';
import { DeleteBoardColumnOutputDataSchema } from '#tools/api/boards/delete-board-column.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: DELETE_BOARD_COLUMN_TOOL_METADATA.name,

  expectedRequests: [{ method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' }],

  happyPath: {
    input: { boardId: '42', columnId: '7' },
    arrange: (api) => {
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
          .expectRequest({ method: 'delete', path: '/v3/boards/42/columns/7', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { boardId: '42', columnId: '7' },
    },
    notFound: {
      // Тот же boardId/columnId, что и в happyPath/forbidden — expectedRequests
      // декларирует конкретный путь один раз (H-1).
      arrange: (api) => {
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

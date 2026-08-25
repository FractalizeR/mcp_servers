/**
 * `boards` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — доска видна за
 * пределами очереди `TEST` (`tests/TESTING_STRATEGY.md` §1). С-4 здесь
 * `мок (гипотеза)`: путь и метод сверены с внешним источником — референсным
 * клиентом `yandex_tracker_client/` (`Boards.path = '/{api_version}/boards/{id}'`,
 * `Collection.delete()` → `DELETE`, дефолтная версия соединения `VERSION_V2`) —
 * путь и метод подтверждены, версия — нет (submodule её не различает); сервер
 * реально ходит в `/v3/boards/{id}`, см. отчёт пакета P1.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { DELETE_BOARD_TOOL_METADATA } from '#tools/api/boards/delete-board.metadata.js';
import { DeleteBoardOutputDataSchema } from '#tools/api/boards/delete-board.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: DELETE_BOARD_TOOL_METADATA.name,

  expectedRequests: [{ method: 'delete', path: '/v3/boards/42', apiVersion: 'v3' }],

  happyPath: {
    input: { boardId: '42' },
    arrange: (api) => {
      api.expectRequest({ method: 'delete', path: '/v3/boards/42', apiVersion: 'v3' }).reply(200);
    },
    outputDataSchema: DeleteBoardOutputDataSchema,
    assertData: (data) => {
      expect(data).toMatchObject({ success: true, boardId: '42' });
      expect(data.message).toContain('42');
    },
  },

  invalidInput: {
    // boardId не может быть пустым (`DeleteBoardParamsSchema`).
    input: { boardId: '' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'delete', path: '/v3/boards/42', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { boardId: '42' },
    },
    notFound: {
      // Тот же boardId, что и в happyPath/forbidden — expectedRequests декларирует
      // конкретный путь `/v3/boards/42` один раз (H-1); 404 здесь — та же операция,
      // отвечающая «доска уже удалена/не существует» на тот же адрес.
      arrange: (api) => {
        api
          .expectRequest({ method: 'delete', path: '/v3/boards/42', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { boardId: '42' },
    },
  },

  // delete_board — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Удаление доски не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  // Ответ не содержит FilteredEntitySchema — FIELDS_WITHOUT_VALUE недостижим.
  warnings: 'not-applicable',
});

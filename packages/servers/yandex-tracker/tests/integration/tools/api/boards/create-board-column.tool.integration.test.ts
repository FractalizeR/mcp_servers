/**
 * `boards` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — колонка доски видна за
 * пределами очереди `TEST` (`tests/TESTING_STRATEGY.md` §1). С-4 здесь
 * `мок (гипотеза)`: см. расхождение версии в `delete-board-column.tool.integration.test.ts`
 * (та же аномалия `tests/TESTING_STRATEGY.md` §2). Завершающий слэш пути
 * (`/v3/boards/{boardId}/columns/`) наблюдается в `create-board-column.operation.ts`
 * и не подтверждён внешним источником — референсный клиент шлёт `create()` на
 * `self.path` без слэша в конце для `id`-параметризованных путей; трактуется как
 * гипотеза этапа 3.1, наблюдаемое поведение фиксируется как есть.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createBoardColumnFixture } from '#helpers/board-columns.fixture.js';
import { CREATE_BOARD_COLUMN_TOOL_METADATA } from '#tools/api/boards/create-board-column.metadata.js';
import { CreateBoardColumnOutputDataSchema } from '#tools/api/boards/create-board-column.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: CREATE_BOARD_COLUMN_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v3/boards/42/columns/', apiVersion: 'v3' }],

  happyPath: {
    input: { boardId: '42', name: 'In Progress', statuses: ['inProgress'], fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/boards/42/columns/',
          apiVersion: 'v3',
          body: { name: 'In Progress', statuses: ['inProgress'] },
        })
        .reply(200, createBoardColumnFixture({ id: '7', name: 'In Progress' }));
    },
    outputDataSchema: CreateBoardColumnOutputDataSchema,
    assertData: (data) => {
      expect(data.column).toMatchObject({ id: '7', name: 'In Progress' });
      expect(data.message).toContain('In Progress');
    },
  },

  invalidInput: {
    // statuses обязателен и не может быть пустым (`CreateBoardColumnParamsSchema`).
    input: { boardId: '42', name: 'Empty', statuses: [], fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/boards/42/columns/', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { boardId: '42', name: 'Restricted', statuses: ['open'], fields: ['id'] },
    },
    notFound: {
      // Тот же boardId, что и в happyPath/forbidden — expectedRequests декларирует
      // конкретный путь один раз (H-1); 404 здесь — та же операция, отвечающая
      // «доска не найдена» на тот же адрес.
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/boards/42/columns/', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { boardId: '42', name: 'Missing board', statuses: ['open'], fields: ['id'] },
    },
  },

  // create_board_column — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Создание колонки не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'post', path: '/v3/boards/42/columns/', apiVersion: 'v3' })
        .reply(200, createBoardColumnFixture({ id: '8', name: 'With Gaps' }));
    },
    input: { boardId: '42', name: 'With Gaps', statuses: ['open'], fields: ['id', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

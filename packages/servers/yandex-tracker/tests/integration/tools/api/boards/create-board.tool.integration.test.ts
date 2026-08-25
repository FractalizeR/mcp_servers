/**
 * Образцовый интеграционный тест на фабрике `describeToolIntegration`
 * (`.agentic-planning/plan_tracker_test_coverage/2.1.1_matrix_and_harness_sequential.md`
 * §E). Категория `boards` живьём не проверяется вовсе (вне очереди `TEST`,
 * `tests/TESTING_STRATEGY.md` §1) — С-4 здесь честно `мок (гипотеза)` в матрице, а не
 * `мок`. После сдачи пакета 2.1.1 файл доступен пакету P1 только на чтение (план §E).
 *
 * Маршрут — `POST /v3/liveBoards/`: `POST /v3/boards` объявлен устаревшим и молча
 * игнорирует тело запроса (0_CONTRACTS.md, D9).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createBoardFixture } from '#helpers/agile.fixture.js';
import { CREATE_BOARD_TOOL_METADATA } from '#tools/api/boards/create-board.metadata.js';
import { CreateBoardOutputDataSchema } from '#tools/api/boards/create-board.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: CREATE_BOARD_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v3/liveBoards/', apiVersion: 'v3' }],

  happyPath: {
    input: { name: 'New Board', queue: 'TEST', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/liveBoards/',
          apiVersion: 'v3',
          body: {
            name: 'New Board',
            autoFilters: {
              addFilter: {
                liveFilter: { fieldValues: { queue: [{ fixed: 'TEST' }] } },
                enabled: true,
              },
            },
          },
        })
        .reply(200, createBoardFixture({ id: 42, name: 'New Board' }));
    },
    outputDataSchema: CreateBoardOutputDataSchema,
    assertData: (data) => {
      expect(data.board).toMatchObject({ id: 42, name: 'New Board' });
      expect(data.message).toContain('New Board');
    },
  },

  invalidInput: {
    // `fields` обязателен (не optional) — CreateBoardParamsSchema, FieldsSchema.
    input: { name: 'Board without fields' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/liveBoards/', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { name: 'Restricted Board', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов create_board — POST /v3/liveBoards/; 404 здесь та же
      // операция, отвечающая «очередь не найдена» (queue из параметров не существует).
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/liveBoards/', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { name: 'Board for missing queue', queue: 'MISSING', fields: ['id'] },
    },
  },

  // create_board — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Создание доски не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // `boardFields` не содержит запрошенное поле "missingField" —
    // ResponseFieldFilter отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({ method: 'post', path: '/v3/liveBoards/', apiVersion: 'v3' })
        .reply(200, createBoardFixture({ id: 43, name: 'Board With Gaps' }));
    },
    input: { name: 'Board With Gaps', queue: 'TEST', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

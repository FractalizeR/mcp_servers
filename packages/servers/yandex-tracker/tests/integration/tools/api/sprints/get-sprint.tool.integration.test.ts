/**
 * Записи в реестре живых наблюдений (`tests/coverage-exceptions/live-observations.ts`)
 * у `get_sprint` нет — С-4 в матрице `мок (гипотеза)`. Категорийного «живьём не
 * наблюдается никогда» больше нет вовсе: `tests/TESTING_STRATEGY.md` §1 — источник
 * ПРИЧИНЫ (песочница, допуск по владению прогоном), реестр — источник СПИСКА.
 *
 * Путь и версия сверены с официальной документацией Яндекс.Трекера.
 * Пакет `sprints` этапа 4.1 перевёл операцию на `GET /v3/sprints/{id}` —
 * расхождение с документацией, отмеченное отчётом пакета P5, устранено.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createSprintFixture } from '#helpers/agile.fixture.js';
import { GET_SPRINT_TOOL_METADATA } from '#tools/api/sprints/get-sprint.metadata.js';
import { GetSprintOutputDataSchema } from '#tools/api/sprints/get-sprint.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: GET_SPRINT_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v3/sprints/88', apiVersion: 'v3' }],

  happyPath: {
    input: { sprintId: '88', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/sprints/88', apiVersion: 'v3' })
        .reply(200, createSprintFixture({ id: 88, name: 'Sprint 88' }));
    },
    outputDataSchema: GetSprintOutputDataSchema,
    assertData: (data) => {
      expect(data.sprint).toMatchObject({ id: 88, name: 'Sprint 88' });
    },
  },

  invalidInput: {
    // `sprintId` не может быть пустым (GetSprintParamsSchema, min(1)).
    input: { sprintId: '', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/sprints/88', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { sprintId: '88', fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/sprints/88', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { sprintId: '88', fields: ['id'] },
    },
  },

  // get_sprint — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Получение одного спринта не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/sprints/88', apiVersion: 'v3' })
        .reply(200, createSprintFixture({ id: 88, name: 'Sprint With Gaps' }));
    },
    input: { sprintId: '88', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

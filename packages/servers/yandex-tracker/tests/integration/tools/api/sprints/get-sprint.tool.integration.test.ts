/**
 * Категория `sprints` целиком в реестре исключений живых прогонов (спринты
 * принадлежат доске — `tests/TESTING_STRATEGY.md` §1): С-4 здесь `мок (гипотеза)`,
 * а не `мок`. Путь и версия сверены с официальной документацией Яндекс.Трекера —
 * см. отчёт пакета P5 (расхождение: актуальная документация 2026 отдаёт
 * `GET /v3/sprints/{id}`, код сервера — `GET /v2/sprints/{id}`).
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

  expectedRequests: [{ method: 'get', path: '/v2/sprints/88', apiVersion: 'v2' }],

  happyPath: {
    input: { sprintId: '88', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v2/sprints/88', apiVersion: 'v2' })
        .reply(200, createSprintFixture({ id: '88', name: 'Sprint 88' }));
    },
    outputDataSchema: GetSprintOutputDataSchema,
    assertData: (data) => {
      expect(data.sprint).toMatchObject({ id: '88', name: 'Sprint 88' });
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
          .expectRequest({ method: 'get', path: '/v2/sprints/88', apiVersion: 'v2' })
          .reply(403, generateError403());
      },
      input: { sprintId: '88', fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v2/sprints/88', apiVersion: 'v2' })
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
        .expectRequest({ method: 'get', path: '/v2/sprints/88', apiVersion: 'v2' })
        .reply(200, createSprintFixture({ id: '88', name: 'Sprint With Gaps' }));
    },
    input: { sprintId: '88', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

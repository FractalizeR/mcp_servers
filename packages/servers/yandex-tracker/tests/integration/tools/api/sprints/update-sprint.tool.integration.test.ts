/**
 * Категория `sprints` целиком в реестре исключений живых прогонов (спринты
 * принадлежат доске — `tests/TESTING_STRATEGY.md` §1): С-4 здесь `мок (гипотеза)`,
 * а не `мок`. Путь и версия сверены с официальной документацией Яндекс.Трекера —
 * см. отчёт пакета P5 (расхождение: актуальная документация 2026 отдаёт
 * `PATCH /v3/sprints/{id}`, код сервера — `PATCH /v2/sprints/{id}`).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createSprintFixture } from '#helpers/agile.fixture.js';
import { UPDATE_SPRINT_TOOL_METADATA } from '#tools/api/sprints/update-sprint.metadata.js';
import { UpdateSprintOutputDataSchema } from '#tools/api/sprints/update-sprint.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: UPDATE_SPRINT_TOOL_METADATA.name,

  expectedRequests: [{ method: 'patch', path: '/v2/sprints/77', apiVersion: 'v2' }],

  happyPath: {
    input: { sprintId: '77', name: 'Renamed Sprint', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v2/sprints/77',
          apiVersion: 'v2',
          body: { name: 'Renamed Sprint' },
        })
        .reply(200, createSprintFixture({ id: '77', name: 'Renamed Sprint' }));
    },
    outputDataSchema: UpdateSprintOutputDataSchema,
    assertData: (data) => {
      expect(data.sprint).toMatchObject({ id: '77', name: 'Renamed Sprint' });
    },
  },

  invalidInput: {
    // `sprintId` не может быть пустым (UpdateSprintParamsSchema, min(1)).
    input: { sprintId: '', name: 'Renamed Sprint', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: '/v2/sprints/77', apiVersion: 'v2' })
          .reply(403, generateError403());
      },
      input: { sprintId: '77', name: 'Restricted rename', fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: '/v2/sprints/77', apiVersion: 'v2' })
          .reply(404, generateError404());
      },
      input: { sprintId: '77', name: 'Rename missing sprint', fields: ['id'] },
    },
  },

  // update_sprint — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Обновление спринта не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'patch', path: '/v2/sprints/77', apiVersion: 'v2' })
        .reply(200, createSprintFixture({ id: '77', name: 'Sprint With Gaps' }));
    },
    input: { sprintId: '77', name: 'Sprint With Gaps', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

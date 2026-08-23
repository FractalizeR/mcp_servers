/**
 * Категория `sprints` целиком в реестре исключений живых прогонов (спринты
 * принадлежат доске — `tests/TESTING_STRATEGY.md` §1): С-4 здесь `мок (гипотеза)`,
 * а не `мок`. Путь и версия сверены с официальной документацией Яндекс.Трекера —
 * см. отчёт пакета P5 (расхождение: актуальная документация 2026 отдаёт
 * `POST /v3/sprints`, код сервера — `POST /v2/sprints`).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createSprintFixture } from '#helpers/agile.fixture.js';
import { CREATE_SPRINT_TOOL_METADATA } from '#tools/api/sprints/create-sprint.metadata.js';
import { CreateSprintOutputDataSchema } from '#tools/api/sprints/create-sprint.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: CREATE_SPRINT_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v2/sprints', apiVersion: 'v2' }],

  happyPath: {
    input: { name: 'New Sprint', board: '10', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v2/sprints',
          apiVersion: 'v2',
          body: { name: 'New Sprint', board: '10' },
        })
        .reply(200, createSprintFixture({ id: '55', name: 'New Sprint' }));
    },
    outputDataSchema: CreateSprintOutputDataSchema,
    assertData: (data) => {
      expect(data.sprint).toMatchObject({ id: '55', name: 'New Sprint' });
      expect(data.message).toContain('New Sprint');
    },
  },

  invalidInput: {
    // `fields` обязателен (не optional) — CreateSprintParamsSchema, FieldsSchema.
    input: { name: 'Sprint without fields', board: '10' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v2/sprints', apiVersion: 'v2' })
          .reply(403, generateError403());
      },
      input: { name: 'Restricted Sprint', board: '10', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов create_sprint — POST /v2/sprints; 404 здесь —
      // та же операция, отвечающая «доска не найдена» (board из параметров не существует).
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v2/sprints', apiVersion: 'v2' })
          .reply(404, generateError404());
      },
      input: { name: 'Sprint for missing board', board: 'MISSING', fields: ['id'] },
    },
  },

  // create_sprint — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Создание спринта не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // `sprint` фикстуры не содержит запрошенное поле "missingField" —
    // ResponseFieldFilter отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({ method: 'post', path: '/v2/sprints', apiVersion: 'v2' })
        .reply(200, createSprintFixture({ id: '56', name: 'Sprint With Gaps' }));
    },
    input: { name: 'Sprint With Gaps', board: '10', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

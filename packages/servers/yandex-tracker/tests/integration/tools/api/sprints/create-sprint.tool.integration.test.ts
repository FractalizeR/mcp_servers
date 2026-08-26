/**
 * С-4/С-5 у `create_sprint` в матрице — `живьём`: реестр
 * (`tests/coverage-exceptions/live-observations.ts`) несёт запись по прогону
 * `sweep7-2026-08-26` — спринт `236` прочитан независимо позже (версии 1→2, 3→4). Клетку производит реестр, а не этот
 * тест: он стоит на моке и свидетельствует лишь совпадение запроса с нашим
 * представлением об API (`tests/TESTING_STRATEGY.md` §1, канон §2).
 *
 * Путь и версия сверены с официальной документацией Яндекс.Трекера.
 * Пакет `sprints` этапа 4.1 перевёл операцию на `POST /v3/sprints` — расхождение
 * с документацией, отмеченное отчётом пакета P5, устранено.
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

  expectedRequests: [{ method: 'post', path: '/v3/sprints', apiVersion: 'v3' }],

  happyPath: {
    input: { name: 'New Sprint', board: '10', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/sprints',
          apiVersion: 'v3',
          body: { name: 'New Sprint', board: '10' },
        })
        .reply(200, createSprintFixture({ id: 55, name: 'New Sprint' }));
    },
    outputDataSchema: CreateSprintOutputDataSchema,
    assertData: (data) => {
      expect(data.sprint).toMatchObject({ id: 55, name: 'New Sprint' });
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
          .expectRequest({ method: 'post', path: '/v3/sprints', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { name: 'Restricted Sprint', board: '10', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов create_sprint — POST /v3/sprints; 404 здесь —
      // та же операция, отвечающая «доска не найдена» (board из параметров не существует).
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/sprints', apiVersion: 'v3' })
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
        .expectRequest({ method: 'post', path: '/v3/sprints', apiVersion: 'v3' })
        .reply(200, createSprintFixture({ id: 56, name: 'Sprint With Gaps' }));
    },
    input: { name: 'Sprint With Gaps', board: '10', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

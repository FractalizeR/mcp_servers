/**
 * Интеграционный тест `create_component` на фабрике `describeToolIntegration`.
 *
 * Категория `api/components` НЕ входит в реестр исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — маршрут подтверждён живьём
 * (D1, `.agentic-planning/plan_tracker_test_coverage/5.2_LIVE_RUN_REPORT_2026-08-25.md`).
 *
 * Путь и форма тела — `POST /v3/components` (D1, `0_CONTRACTS.md`): маршрута
 * `POST /v3/queues/{q}/components` в API нет, очередь передаётся ключом в теле (`queue`).
 *
 * Раньше тело запроса не сверялось вовсе (`mockCreateComponentSuccess` отвечал успехом
 * независимо от тела, `tests/integration/helpers/mock-server.ts`) — ровно так маршрут,
 * которого нет в API, годами казался рабочим. `ApiExpectationSet.expectRequest` сверяет
 * тело строго — тот же вес, что у соседних семейств (`create_board`/`create_project`/
 * `create_global_field`).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createComponentFixture } from '#helpers/component.fixture.js';
import { CREATE_COMPONENT_TOOL_METADATA } from '#tools/api/components/create-component.metadata.js';
import { CreateComponentOutputDataSchema } from '#tools/api/components/create-component.schema.js';
import { STANDARD_COMPONENT_FIELDS } from '#helpers/test-fields.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: CREATE_COMPONENT_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v3/components', apiVersion: 'v3' }],

  happyPath: {
    input: { queueId: 'TEST', name: 'Backend', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/components',
          apiVersion: 'v3',
          body: { queue: 'TEST', name: 'Backend' },
        })
        .reply(201, createComponentFixture({ id: 42, name: 'Backend' }));
    },
    outputDataSchema: CreateComponentOutputDataSchema,
    assertData: (data) => {
      expect(data.component).toMatchObject({ id: 42, name: 'Backend' });
      expect(data.message).toContain('Backend');
    },
  },

  invalidInput: {
    // `fields` обязателен (не optional) — CreateComponentParamsSchema, FieldsSchema.
    input: { queueId: 'TEST', name: 'Component without fields' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/components', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { queueId: 'RESTRICTED', name: 'Restricted', fields: [...STANDARD_COMPONENT_FIELDS] },
    },
    notFound: {
      // Единственный HTTP-вызов create_component — POST /v3/components; 404 здесь —
      // та же операция, отвечающая «очередь не найдена».
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/components', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: {
        queueId: 'MISSING',
        name: 'For missing queue',
        fields: [...STANDARD_COMPONENT_FIELDS],
      },
    },
  },

  // create_component — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Создание компонента не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // Ответ не содержит запрошенное поле "missingField" —
    // ResponseFieldFilter отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({ method: 'post', path: '/v3/components', apiVersion: 'v3' })
        .reply(201, createComponentFixture({ id: 43, name: 'Component With Gaps' }));
    },
    input: {
      queueId: 'TEST',
      name: 'Component With Gaps',
      fields: [...STANDARD_COMPONENT_FIELDS, 'missingField'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

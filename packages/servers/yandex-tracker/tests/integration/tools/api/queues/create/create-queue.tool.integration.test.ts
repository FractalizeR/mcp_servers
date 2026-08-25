/**
 * Интеграционный тест `create_queue` на фабрике `describeToolIntegration`.
 *
 * Категория `api/queues` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — живой прогон 2026-08-25
 * дошёл до `POST /v3/queues/` и упал на отсутствовавшем тогда `issueTypesConfig` (D7,
 * `.agentic-planning/plan_tracker_test_coverage/5.2_LIVE_RUN_REPORT_2026-08-25.md`),
 * успешного создания очереди не наблюдалось. С-4 здесь честно `мок (гипотеза)`.
 *
 * Раньше тело запроса не сверялось вовсе (`mockCreateQueueSuccess` отвечал успехом
 * независимо от тела, `tests/integration/helpers/mock-server.ts`). `ApiExpectationSet.
 * expectRequest` сверяет тело строго — тот же вес, что у соседних семейств
 * (`create_board`/`create_global_field`).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createQueueFixture } from '#helpers/queue.fixture.js';
import { CREATE_QUEUE_TOOL_METADATA } from '#tools/api/queues/create-queue.metadata.js';
import { CreateQueueOutputDataSchema } from '#tools/api/queues/create-queue.schema.js';
import { STANDARD_QUEUE_FIELDS } from '#helpers/test-fields.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

const ISSUE_TYPES_CONFIG = [
  { issueType: '1', workflow: 'quickStartV2PresetWorkflow', resolutions: ['fixed', 'wontFix'] },
];

const BASE_INPUT = {
  key: 'NEWQ',
  name: 'New Queue',
  lead: 'testuser',
  defaultType: 'task',
  defaultPriority: 'normal',
  issueTypesConfig: ISSUE_TYPES_CONFIG,
};

describeToolIntegration({
  tool: CREATE_QUEUE_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v3/queues/', apiVersion: 'v3' }],

  happyPath: {
    input: { ...BASE_INPUT, fields: ['id', 'key', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/queues/',
          apiVersion: 'v3',
          body: BASE_INPUT,
        })
        .reply(201, createQueueFixture({ id: 42, key: 'NEWQ', name: 'New Queue' }));
    },
    outputDataSchema: CreateQueueOutputDataSchema,
    assertData: (data) => {
      expect(data.queueKey).toBe('NEWQ');
      expect(data.queue).toMatchObject({ id: 42, key: 'NEWQ' });
    },
  },

  invalidInput: {
    // `issueTypesConfig` обязателен (не optional) — CreateQueueParamsSchema.
    input: {
      key: 'NEWQ',
      name: 'New Queue',
      lead: 'testuser',
      defaultType: 'task',
      defaultPriority: 'normal',
    },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/queues/', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { ...BASE_INPUT, key: 'RESTRQ', fields: [...STANDARD_QUEUE_FIELDS] },
    },
    notFound: {
      // Единственный HTTP-вызов create_queue — POST /v3/queues/; 404 здесь —
      // та же операция, отвечающая «руководитель очереди не найден».
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/queues/', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: {
        ...BASE_INPUT,
        key: 'NOLEADQ',
        lead: 'missing-user',
        fields: [...STANDARD_QUEUE_FIELDS],
      },
    },
  },

  // create_queue — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Создание очереди не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // Ответ не содержит запрошенное поле "missingField" —
    // ResponseFieldFilter отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({ method: 'post', path: '/v3/queues/', apiVersion: 'v3' })
        .reply(201, createQueueFixture({ id: 43, key: 'GAPQ' }));
    },
    input: {
      ...BASE_INPUT,
      key: 'GAPQ',
      fields: [...STANDARD_QUEUE_FIELDS, 'missingField'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

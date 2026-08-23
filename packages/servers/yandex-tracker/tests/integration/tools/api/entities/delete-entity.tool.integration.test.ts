/**
 * Интеграционный тест `delete_entity` на фабрике `describeToolIntegration`
 * (`.agentic-planning/plan_tracker_test_coverage/2.1.2_category_packages_parallel.md`,
 * пакет P2). Entity API целиком в реестре исключений живых прогонов
 * (`tests/TESTING_STRATEGY.md` §1) — путь/метод сверены с внешним источником
 * истины (см. отчёт исполнителя пакета), а не с собственным кодом операции.
 *
 * API: `DELETE /v3/entities/{entityType}/{entityId}` — подтверждено официальной
 * документацией (yandex.ru/support/tracker/en/api-ref/entities/delete-entity).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { DELETE_ENTITY_TOOL_METADATA } from '#tools/api/entities/delete-entity.metadata.js';
import { DeleteEntityOutputDataSchema } from '#tools/api/entities/delete-entity.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: DELETE_ENTITY_TOOL_METADATA.name,

  expectedRequests: [{ method: 'delete', path: '/v3/entities/goal/GOAL-1', apiVersion: 'v3' }],

  happyPath: {
    input: { entityType: 'goal', entityId: 'GOAL-1' },
    arrange: (api) => {
      api
        .expectRequest({ method: 'delete', path: '/v3/entities/goal/GOAL-1', apiVersion: 'v3' })
        .reply(200, {});
    },
    outputDataSchema: DeleteEntityOutputDataSchema,
    assertData: (data) => {
      expect(data).toMatchObject({ success: true, entityType: 'goal', entityId: 'GOAL-1' });
      expect(data.message).toContain('GOAL-1');
    },
  },

  invalidInput: {
    // entityId не может быть пустым (min(1)) — DeleteEntityParamsSchema.
    input: { entityType: 'goal', entityId: '' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'delete', path: '/v3/entities/goal/GOAL-1', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { entityType: 'goal', entityId: 'GOAL-1' },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'delete', path: '/v3/entities/goal/GOAL-1', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { entityType: 'goal', entityId: 'GOAL-1' },
    },
  },

  // Единичная операция удаления, batch-режима нет.
  batch: 'not-applicable',

  // Не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  // Ответ — плоское success-сообщение, ResponseFieldFilter не участвует.
  warnings: 'not-applicable',
});

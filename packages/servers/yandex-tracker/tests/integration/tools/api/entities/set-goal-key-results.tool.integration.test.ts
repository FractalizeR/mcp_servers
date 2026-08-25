/**
 * Интеграционный тест `set_goal_key_results` на фабрике `describeToolIntegration`
 * (план 2.1.2, пакет P2). Entity API в реестре исключений живых прогонов
 * (`tests/TESTING_STRATEGY.md` §1).
 *
 * API: `PATCH /v3/entities/goal/{id}` с телом
 * `{ fields: { keyResultItems: [<item>, ...] } }` — путь/метод подтверждены
 * официальной документацией (update-entity); форма тела (голый массив, БЕЗ обёртки
 * `set`, которую предписывает общая конвенция `api-ref/common-format` для массивных
 * полей) — референсным клиентом (`Goal.set_key_results` →
 * `_update_key_results(goal, payload, ...)`, `yandex_tracker_client/collections.py`,
 * `payload` — голый список). См. отчёт исполнителя пакета про это расхождение.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createKeyResultItemFixture } from '#helpers/entity-api.fixture.js';
import { SET_GOAL_KEY_RESULTS_TOOL_METADATA } from '#tools/api/entities/set-goal-key-results.metadata.js';
import { SetGoalKeyResultsOutputDataSchema } from '#tools/api/entities/set-goal-key-results.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

// `SetGoalKeyResultsOperation` вшивает `?fields=keyResultItems` прямо в путь —
// та же константа, что у остальных key-results ручек (см. докблок операции).
describeToolIntegration({
  tool: SET_GOAL_KEY_RESULTS_TOOL_METADATA.name,

  expectedRequests: [
    {
      method: 'patch',
      path: '/v3/entities/goal/GOAL-1',
      apiVersion: 'v3',
      query: { fields: 'keyResultItems' },
    },
  ],

  happyPath: {
    input: { goalId: 'GOAL-1', items: [{ type: 'binary', text: 'Ship X' }] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/entities/goal/GOAL-1',
          apiVersion: 'v3',
          query: { fields: 'keyResultItems' },
          body: { fields: { keyResultItems: [{ type: 'binary', text: 'Ship X' }] } },
        })
        .reply(200, {
          fields: {
            keyResultItems: [
              createKeyResultItemFixture({ id: 'kr1', type: 'binary', text: 'Ship X' }),
            ],
          },
        });
    },
    outputDataSchema: SetGoalKeyResultsOutputDataSchema,
    assertData: (data) => {
      expect(data.goalId).toBe('GOAL-1');
      expect(data.keyResults).toHaveLength(1);
      expect(data.count).toBe(1);
    },
  },

  invalidInput: {
    // items не может быть пустым (min(1)) — SetGoalKeyResultsParamsSchema.
    input: { goalId: 'GOAL-1', items: [] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'patch',
            path: '/v3/entities/goal/GOAL-1',
            apiVersion: 'v3',
            query: { fields: 'keyResultItems' },
          })
          .reply(403, generateError403());
      },
      input: { goalId: 'GOAL-1', items: [{ type: 'binary', text: 'Ship X' }] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'patch',
            path: '/v3/entities/goal/GOAL-1',
            apiVersion: 'v3',
            query: { fields: 'keyResultItems' },
          })
          .reply(404, generateError404());
      },
      input: { goalId: 'GOAL-1', items: [{ type: 'binary', text: 'Ship X' }] },
    },
  },

  batch: 'not-applicable',
  pagination: 'none',
  warnings: 'not-applicable',
});

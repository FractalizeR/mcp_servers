/**
 * Интеграционный тест `clear_goal_key_results` на фабрике `describeToolIntegration`
 * (план 2.1.2, пакет P2). Записей в реестре живых наблюдений
 * (`tests/coverage-exceptions/live-observations.ts`) на Entity API нет — С-4 в матрице
 * `мок (гипотеза)`. Категорийного «живьём не наблюдается никогда» больше нет вовсе:
 * `tests/TESTING_STRATEGY.md` §1 — источник ПРИЧИНЫ, реестр — источник СПИСКА.
 *
 * API: `PATCH /v3/entities/goal/{id}` с телом `{ fields: { keyResultItems: null } }` —
 * путь/метод подтверждены официальной документацией (update-entity), тело мутации
 * `keyResultItems` — референсным клиентом (`Goal.clear_key_results` →
 * `_update_key_results(goal, None, ...)`, `yandex_tracker_client/collections.py`).
 * Официальная общая конвенция редактирования массивных полей (add/set/replace,
 * `api-ref/common-format`) описывает `set`-обёртку и `[]` для очистки — сюда не
 * применяется: `keyResultItems` —「ленивое」 поле со своей, недокументированной в
 * common-format, но подтверждённой референсным клиентом семантикой (см. отчёт
 * исполнителя пакета).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { CLEAR_GOAL_KEY_RESULTS_TOOL_METADATA } from '#tools/api/entities/clear-goal-key-results.metadata.js';
import { ClearGoalKeyResultsOutputDataSchema } from '#tools/api/entities/clear-goal-key-results.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

// `ClearGoalKeyResultsOperation` вшивает `?fields=keyResultItems` прямо в
// путь — та же константа, что у остальных key-results ручек (см. докблок
// операции); ответ здесь не парсится содержательно, но запрос уходит с той
// же query, что и у get/add/set.
describeToolIntegration({
  tool: CLEAR_GOAL_KEY_RESULTS_TOOL_METADATA.name,

  expectedRequests: [
    {
      method: 'patch',
      path: '/v3/entities/goal/GOAL-1',
      apiVersion: 'v3',
      query: { fields: 'keyResultItems' },
    },
  ],

  happyPath: {
    input: { goalId: 'GOAL-1' },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/entities/goal/GOAL-1',
          apiVersion: 'v3',
          query: { fields: 'keyResultItems' },
          body: { fields: { keyResultItems: null } },
        })
        .reply(200, {});
    },
    outputDataSchema: ClearGoalKeyResultsOutputDataSchema,
    assertData: (data) => {
      expect(data).toMatchObject({ success: true, goalId: 'GOAL-1' });
      expect(data.message).toContain('GOAL-1');
    },
  },

  invalidInput: {
    // goalId не может быть пустым (min(1)) — ClearGoalKeyResultsParamsSchema.
    input: { goalId: '' },
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
      input: { goalId: 'GOAL-1' },
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
      input: { goalId: 'GOAL-1' },
    },
  },

  batch: 'not-applicable',
  pagination: 'none',
  warnings: 'not-applicable',
});

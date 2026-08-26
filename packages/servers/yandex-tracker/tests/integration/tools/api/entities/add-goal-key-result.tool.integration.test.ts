/**
 * Интеграционный тест `add_goal_key_result` на фабрике `describeToolIntegration`
 * (план 2.1.2, пакет P2). Записей в реестре живых наблюдений
 * (`tests/coverage-exceptions/live-observations.ts`) на Entity API нет — С-4 в матрице
 * `мок (гипотеза)`. Категорийного «живьём не наблюдается никогда» больше нет вовсе:
 * `tests/TESTING_STRATEGY.md` §1 — источник ПРИЧИНЫ, реестр — источник СПИСКА.
 *
 * API: `PATCH /v3/entities/goal/{id}` с телом
 * `{ fields: { keyResultItems: { add: <item> } } }` — путь/метод подтверждены
 * официальной документацией (update-entity); форма тела (единичный объект внутри
 * `add`, а не массив, которого требует общая конвенция `api-ref/common-format`)
 * — референсным клиентом (`Goal.add_key_result` →
 * `_update_key_results(goal, {'add': item}, ...)`,
 * `yandex_tracker_client/collections.py`). См. отчёт исполнителя пакета.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createKeyResultItemFixture } from '#helpers/entity-api.fixture.js';
import { ADD_GOAL_KEY_RESULT_TOOL_METADATA } from '#tools/api/entities/add-goal-key-result.metadata.js';
import { AddGoalKeyResultOutputDataSchema } from '#tools/api/entities/add-goal-key-result.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

// `AddGoalKeyResultOperation` вшивает `?fields=keyResultItems` прямо в путь —
// константа, независимая от входа инструмента (`add_goal_key_result` не
// принимает `fields` вовсе): без неё API не отдаёт `keyResultItems` в ответе
// на PATCH (ленивое поле).
describeToolIntegration({
  tool: ADD_GOAL_KEY_RESULT_TOOL_METADATA.name,

  expectedRequests: [
    {
      method: 'patch',
      path: '/v3/entities/goal/GOAL-1',
      apiVersion: 'v3',
      query: { fields: 'keyResultItems' },
    },
  ],

  happyPath: {
    input: {
      goalId: 'GOAL-1',
      item: { type: 'value', text: 'Increase X', progress: { start: 0, end: 100 } },
    },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/entities/goal/GOAL-1',
          apiVersion: 'v3',
          query: { fields: 'keyResultItems' },
          body: {
            fields: {
              keyResultItems: {
                add: { type: 'value', text: 'Increase X', progress: { start: 0, end: 100 } },
              },
            },
          },
        })
        .reply(200, {
          fields: {
            keyResultItems: [
              createKeyResultItemFixture({ id: 'kr1', type: 'binary', text: 'Existing' }),
              createKeyResultItemFixture({
                id: 'kr2',
                type: 'value',
                text: 'Increase X',
                progress: { start: 0, end: 100 },
              }),
            ],
          },
        });
    },
    outputDataSchema: AddGoalKeyResultOutputDataSchema,
    assertData: (data) => {
      expect(data.goalId).toBe('GOAL-1');
      expect(data.keyResults).toHaveLength(2);
      expect(data.count).toBe(2);
      // С-3 (регрессия «идентификатор потерялся при фильтрации», см. find_issues):
      // конкретный добавленный элемент проверяется поимённо, а не только длина
      // массива — счётчик уже гарантирован `assertMatchesOutputSchema`.
      expect(data.keyResults[1]).toMatchObject({
        id: 'kr2',
        type: 'value',
        text: 'Increase X',
      });
    },
  },

  invalidInput: {
    // item.text обязателен и не может быть пустым — KeyResultItemInputSchema.
    input: { goalId: 'GOAL-1', item: { type: 'binary', text: '' } },
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
      input: { goalId: 'GOAL-1', item: { type: 'binary', text: 'Ship X' } },
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
      input: { goalId: 'GOAL-1', item: { type: 'binary', text: 'Ship X' } },
    },
  },

  batch: 'not-applicable',
  pagination: 'none',
  warnings: 'not-applicable',
});

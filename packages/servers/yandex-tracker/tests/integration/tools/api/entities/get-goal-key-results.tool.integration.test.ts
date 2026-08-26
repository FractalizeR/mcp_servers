/**
 * Интеграционный тест `get_goal_key_results` на фабрике `describeToolIntegration`
 * (план 2.1.2, пакет P2). Записей в реестре живых наблюдений
 * (`tests/coverage-exceptions/live-observations.ts`) на Entity API нет — С-4 в матрице
 * `мок (гипотеза)`. Категорийного «живьём не наблюдается никогда» больше нет вовсе:
 * `tests/TESTING_STRATEGY.md` §1 — источник ПРИЧИНЫ, реестр — источник СПИСКА.
 *
 * API: `GET /v3/entities/goal/{id}?fields=keyResultItems` — тот же путь/метод, что
 * `get_entity` (update-entity/get-entity API, подтверждено официальной
 * документацией), с ленивым полем `keyResultItems`, запрашиваемым явно — см.
 * референсный клиент (`Goal.key_results`, `yandex_tracker_client/collections.py`).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createKeyResultItemFixture } from '#helpers/entity-api.fixture.js';
import { GET_GOAL_KEY_RESULTS_TOOL_METADATA } from '#tools/api/entities/get-goal-key-results.metadata.js';
import { GetGoalKeyResultsOutputDataSchema } from '#tools/api/entities/get-goal-key-results.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

// `GetGoalKeyResultsOperation` вшивает `?fields=keyResultItems` прямо в путь —
// константа, НЕ зависящая от входного `fields` инструмента (тот фильтрует
// ответ клиентски, см. докблок операции): без неё API не отдаёт
// `keyResultItems` вовсе (ленивое поле).
describeToolIntegration({
  tool: GET_GOAL_KEY_RESULTS_TOOL_METADATA.name,

  expectedRequests: [
    {
      method: 'get',
      path: '/v3/entities/goal/GOAL-1',
      apiVersion: 'v3',
      query: { fields: 'keyResultItems' },
    },
  ],

  happyPath: {
    input: { goalId: 'GOAL-1', fields: ['id', 'type', 'text'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'get',
          path: '/v3/entities/goal/GOAL-1',
          apiVersion: 'v3',
          query: { fields: 'keyResultItems' },
        })
        .reply(200, {
          fields: {
            keyResultItems: [
              createKeyResultItemFixture({ id: 'kr1', type: 'binary', text: 'Ship X' }),
            ],
          },
        });
    },
    outputDataSchema: GetGoalKeyResultsOutputDataSchema,
    assertData: (data) => {
      expect(data.goalId).toBe('GOAL-1');
      expect(data.keyResults).toHaveLength(1);
      expect(data.count).toBe(1);
    },
  },

  invalidInput: {
    // fields обязателен (не optional) — GetGoalKeyResultsParamsSchema.
    input: { goalId: 'GOAL-1' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'get',
            path: '/v3/entities/goal/GOAL-1',
            apiVersion: 'v3',
            query: { fields: 'keyResultItems' },
          })
          .reply(403, generateError403());
      },
      input: { goalId: 'GOAL-1', fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'get',
            path: '/v3/entities/goal/GOAL-1',
            apiVersion: 'v3',
            query: { fields: 'keyResultItems' },
          })
          .reply(404, generateError404());
      },
      input: { goalId: 'GOAL-1', fields: ['id'] },
    },
  },

  batch: 'not-applicable',
  pagination: 'none',

  warnings: {
    // Запрошено "deadline" — фикстура его не содержит (нет значения ни у одного
    // элемента ответа) — ResponseFieldFilter отдаёт FIELDS_WITHOUT_VALUE. Это
    // фильтрация ПОСЛЕ ответа обычными именами полей KeyResultItem (не
    // `fields.<name>`-проекция Entity API, `extractEntityApiFields` здесь не
    // участвует) — недостижимости 200, описанной для create/get/update/
    // find_entities (422 на неизвестное имя), здесь нет.
    arrange: (api) => {
      api
        .expectRequest({
          method: 'get',
          path: '/v3/entities/goal/GOAL-1',
          apiVersion: 'v3',
          query: { fields: 'keyResultItems' },
        })
        .reply(200, {
          fields: {
            keyResultItems: [
              createKeyResultItemFixture({ id: 'kr1', type: 'binary', text: 'Ship X' }),
            ],
          },
        });
    },
    input: { goalId: 'GOAL-1', fields: ['id', 'deadline'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

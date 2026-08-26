/**
 * Записи в реестре живых наблюдений (`tests/coverage-exceptions/live-observations.ts`)
 * у `get_sprints` нет — С-4 в матрице `мок (гипотеза)`. Категорийного «живьём не
 * наблюдается никогда» больше нет вовсе: `tests/TESTING_STRATEGY.md` §1 — источник
 * ПРИЧИНЫ (песочница, допуск по владению прогоном), реестр — источник СПИСКА.
 *
 * Путь и версия сверены с официальной документацией Яндекс.Трекера.
 * Пакет `sprints` этапа 4.1 перевёл операцию на `GET /v3/boards/{id}/sprints` —
 * расхождение с документацией, отмеченное отчётом пакета P5, устранено.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createSprintFixture } from '#helpers/agile.fixture.js';
import { GET_SPRINTS_TOOL_METADATA } from '#tools/api/sprints/get-sprints.metadata.js';
import { GetSprintsOutputDataSchema } from '#tools/api/sprints/get-sprints.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
  assertNoWarnings,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: GET_SPRINTS_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' }],

  happyPath: {
    input: { boardId: '5', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
        .reply(200, [
          createSprintFixture({ id: 1, name: 'Sprint 1' }),
          createSprintFixture({ id: 2, name: 'Sprint 2' }),
        ]);
    },
    outputDataSchema: GetSprintsOutputDataSchema,
    assertData: (data) => {
      // Проверяем конкретные элементы поимённо (id + отфильтрованное поле name),
      // а не только количество — иначе приращение над assertMatchesOutputSchema
      // отсутствует (регрессия С-3: идентификатор теряется при фильтрации полей,
      // уже случалось в find_issues).
      expect(data.count).toBe(2);
      expect(data.boardId).toBe('5');
      expect(data.sprints).toEqual([
        { id: 1, name: 'Sprint 1' },
        { id: 2, name: 'Sprint 2' },
      ]);
    },
  },

  invalidInput: {
    // `boardId` не может быть пустым (GetSprintsParamsSchema, min(1)).
    input: { boardId: '', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { boardId: '5', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов get_sprints — GET /v3/boards/{id}/sprints; 404
      // здесь — доска с таким boardId не найдена.
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { boardId: '5', fields: ['id'] },
    },
  },

  // get_sprints — список без batch-режима (batch-параметров у инструмента нет).
  batch: 'not-applicable',

  // GetSprintsParamsSchema (комментарий схемы): эндпоинт спринтов доски НЕ
  // пагинируется в реализации — весь список отдаётся одним ответом, аналогично
  // get_components/get_boards.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
        .reply(200, [createSprintFixture({ id: 1, name: 'Sprint With Gaps' })]);
    },
    input: { boardId: '5', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('get_sprints — доска без единого спринта (достижимо в норме, не только как деградация)', () => {
  const ctx = useToolIntegrationContext();

  it('пустой список: sprints=[], count=0, без warnings', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/boards/5/sprints', apiVersion: 'v3' })
      .reply(200, []);

    const result = await ctx.client.callTool(GET_SPRINTS_TOOL_METADATA.name, {
      boardId: '5',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, GetSprintsOutputDataSchema);
    assertNoWarnings(result);
    expect(data.sprints).toEqual([]);
    expect(data.count).toBe(0);
    expect(data.boardId).toBe('5');
    ctx.api.assertAllExpectationsMet();
  });
});

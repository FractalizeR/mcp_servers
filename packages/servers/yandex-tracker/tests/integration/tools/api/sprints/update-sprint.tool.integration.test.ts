/**
 * Категория `sprints` целиком в реестре исключений живых прогонов (спринты
 * принадлежат доске — `tests/TESTING_STRATEGY.md` §1): С-4 здесь `мок (гипотеза)`,
 * а не `мок`. Путь и версия сверены с официальной документацией Яндекс.Трекера.
 * Пакет `sprints` этапа 4.1 перевёл операцию на `PATCH /v3/sprints/{id}` —
 * расхождение с документацией, отмеченное отчётом пакета P5, устранено.
 *
 * `PATCH /v3/sprints/{id}` требует версию (`428` без неё, `400 version: Incorrect
 * data format` — версией в теле): версия — query-параметр `?version=`, и по
 * умолчанию (вход без `version`) операция читает её сама через предварительный
 * `GET /v3/sprints/{id}` (живая проба 2026-08-26, пакет sweep7 §B).
 *
 * `happyPath` передаёт `version` явно (без GET, без `VERSION_NOT_PROVIDED`) —
 * фабрика проверяет happy path на отсутствие warnings, а версия по умолчанию
 * ровно его и порождает. Дефолтный путь (без `version` — GET читает её сам)
 * покрыт `errors.forbidden`/`errors.notFound`/`warnings` ниже: GET читает версию
 * успешно, а ошибку 403/404 несёт именно PATCH — симметрично `update_component`,
 * где тот же приём уже принят (`mockUpdateComponent404`).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createSprintFixture } from '#helpers/agile.fixture.js';
import { UPDATE_SPRINT_TOOL_METADATA } from '#tools/api/sprints/update-sprint.metadata.js';
import { UpdateSprintOutputDataSchema } from '#tools/api/sprints/update-sprint.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: UPDATE_SPRINT_TOOL_METADATA.name,

  expectedRequests: [
    { method: 'get', path: '/v3/sprints/77', apiVersion: 'v3' },
    { method: 'patch', path: '/v3/sprints/77', apiVersion: 'v3', query: { version: 5 } },
  ],

  happyPath: {
    input: { sprintId: '77', name: 'Renamed Sprint', version: 5, fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/sprints/77',
          apiVersion: 'v3',
          query: { version: 5 },
          body: { name: 'Renamed Sprint' },
        })
        .reply(200, createSprintFixture({ id: 77, version: 5, name: 'Renamed Sprint' }));
    },
    outputDataSchema: UpdateSprintOutputDataSchema,
    assertData: (data) => {
      expect(data.sprint).toMatchObject({ id: 77, name: 'Renamed Sprint' });
    },
  },

  invalidInput: {
    // `sprintId` не может быть пустым (UpdateSprintParamsSchema, min(1)).
    input: { sprintId: '', name: 'Renamed Sprint', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/sprints/77', apiVersion: 'v3' })
          .reply(200, createSprintFixture({ id: 77, version: 5 }));
        api
          .expectRequest({
            method: 'patch',
            path: '/v3/sprints/77',
            apiVersion: 'v3',
            query: { version: 5 },
          })
          .reply(403, generateError403());
      },
      input: { sprintId: '77', name: 'Restricted rename', fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/sprints/77', apiVersion: 'v3' })
          .reply(200, createSprintFixture({ id: 77, version: 5 }));
        api
          .expectRequest({
            method: 'patch',
            path: '/v3/sprints/77',
            apiVersion: 'v3',
            query: { version: 5 },
          })
          .reply(404, generateError404());
      },
      input: { sprintId: '77', name: 'Rename missing sprint', fields: ['id'] },
    },
  },

  // update_sprint — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Обновление спринта не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/sprints/77', apiVersion: 'v3' })
        .reply(200, createSprintFixture({ id: 77, version: 5 }));
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/sprints/77',
          apiVersion: 'v3',
          query: { version: 5 },
        })
        .reply(200, createSprintFixture({ id: 77, version: 5, name: 'Sprint With Gaps' }));
    },
    input: { sprintId: '77', name: 'Sprint With Gaps', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('update_sprint — версия не передана: ровно один GET, PATCH несёт прочитанную', () => {
  const ctx = useToolIntegrationContext();

  it('успех + предупреждение VERSION_NOT_PROVIDED, GET вызван ровно один раз', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/sprints/78', apiVersion: 'v3' })
      .reply(200, createSprintFixture({ id: 78, version: 6 }));
    ctx.api
      .expectRequest({
        method: 'patch',
        path: '/v3/sprints/78',
        apiVersion: 'v3',
        query: { version: 6 },
        body: { name: 'Renamed Without Version' },
      })
      .reply(200, createSprintFixture({ id: 78, version: 6, name: 'Renamed Without Version' }));

    const result = await ctx.client.callTool(UPDATE_SPRINT_TOOL_METADATA.name, {
      sprintId: '78',
      name: 'Renamed Without Version',
      fields: ['id', 'name'],
    });

    expect(result.isError, JSON.stringify(result)).toBeUndefined();
    expect(ctx.api.attemptedCount).toBe(2);
    const data = assertMatchesOutputSchema(result, UpdateSprintOutputDataSchema);
    expect(data.sprint).toMatchObject({ id: 78, name: 'Renamed Without Version' });
    const structured = result['structuredContent'] as { warnings?: Array<{ code: string }> };
    expect(structured.warnings?.map((w) => w.code)).toContain('VERSION_NOT_PROVIDED');
    ctx.api.assertAllExpectationsMet();
  });
});

/**
 * Категория `sprints` целиком в реестре исключений живых прогонов (спринты
 * принадлежат доске — `tests/TESTING_STRATEGY.md` §1): С-4 здесь `мок (гипотеза)`,
 * а не `мок`. Пути и версии сверены с официальной документацией Яндекс.Трекера —
 * см. `manage-sprint-lifecycle.operation.ts` и отчёт пакета P5.
 *
 * `_start`/`_archive` требуют версию query-параметром (`428` без неё — живая проба
 * 2026-08-26, пакет sweep7 §B): по умолчанию (вход без `version`) операция читает
 * её сама через предварительный `GET /v3/sprints/{id}`, поэтому GET предшествует
 * POST в КАЖДОМ arrange ниже, включая errors.forbidden/notFound — GET читает
 * версию успешно, ошибку 403/404 несёт POST (симметрично `update_component`).
 * `delete` версии не требует — своего GET не имеет вовсе.
 *
 * `fields` — обязательный параметр схемы (живая проба 2026-08-26, спринт 238:
 * без реальной фильтрации в тело ответа уходили ключи, которых `fields` не
 * запрашивал вовсе, — инструмент декларировал `FilteredEntitySchema`, но не
 * фильтровал). Инструмент фильтрует ответ через `ResponseFieldFilter`, кроме
 * `delete` — там `sprint` равен `null`, фильтровать нечего.
 *
 * Обязательный состав фабрики покрыт на режиме `start`; `archive` и `delete`
 * (разные endpoint/версия действия) — отдельными `it()` ниже на
 * `useToolIntegrationContext()`/`assertMatchesOutputSchema` (план §P5).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createSprintFixture } from '#helpers/agile.fixture.js';
import { MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA } from '#tools/api/sprints/manage-sprint-lifecycle.metadata.js';
import { ManageSprintLifecycleOutputDataSchema } from '#tools/api/sprints/manage-sprint-lifecycle.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
  assertWarnings,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.name,

  expectedRequests: [
    { method: 'get', path: '/v3/sprints/100', apiVersion: 'v3' },
    { method: 'post', path: '/v3/sprints/100/_start', apiVersion: 'v3', query: { version: 4 } },
  ],

  happyPath: {
    // Версия передана явно (без GET, без VERSION_NOT_PROVIDED) — фабрика проверяет
    // happy path на отсутствие warnings, а версия по умолчанию (GET) их порождает.
    // Дефолтный путь без `version` — отдельный блок ниже
    // («без version: предупреждает VERSION_NOT_PROVIDED»), симметрично `update_sprint`.
    input: { sprintId: '100', action: 'start', version: 4, fields: ['id', 'status'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/sprints/100/_start',
          apiVersion: 'v3',
          query: { version: 4 },
        })
        .reply(
          200,
          createSprintFixture({
            id: 100,
            version: 4,
            name: 'Sprint 1',
            status: 'in_progress',
            board: { id: 20, self: 'url', display: 'Board' },
          })
        );
    },
    outputDataSchema: ManageSprintLifecycleOutputDataSchema,
    assertData: (data) => {
      expect(data.sprintId).toBe('100');
      expect(data.action).toBe('start');
      // Только запрошенные поля — незапрошенные (name, board, version, self) отсутствуют.
      expect(data.sprint).toEqual({ id: 100, status: 'in_progress' });
      expect(data.message).toContain('100');
    },
  },

  invalidInput: {
    // `action` — замкнутый enum ('start' | 'archive' | 'delete'); значение вне
    // перечисления отклоняется до HTTP.
    input: { sprintId: '100', action: 'pause', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/sprints/100', apiVersion: 'v3' })
          .reply(200, createSprintFixture({ id: 100, version: 4 }));
        api
          .expectRequest({
            method: 'post',
            path: '/v3/sprints/100/_start',
            apiVersion: 'v3',
            query: { version: 4 },
          })
          .reply(403, generateError403());
      },
      input: { sprintId: '100', action: 'start', fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/sprints/100', apiVersion: 'v3' })
          .reply(200, createSprintFixture({ id: 100, version: 4 }));
        api
          .expectRequest({
            method: 'post',
            path: '/v3/sprints/100/_start',
            apiVersion: 'v3',
            query: { version: 4 },
          })
          .reply(404, generateError404());
      },
      input: { sprintId: '100', action: 'start', fields: ['id'] },
    },
  },

  // Единичное действие над одним спринтом — batch-режима нет.
  batch: 'not-applicable',

  // Не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  // Инструмент фильтрует ответ через `ResponseFieldFilter` (кроме `delete`, где
  // `sprint` равен `null`) — запрошенное отсутствующее поле даёт FIELDS_WITHOUT_VALUE.
  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/sprints/100', apiVersion: 'v3' })
        .reply(200, createSprintFixture({ id: 100, version: 4 }));
      api
        .expectRequest({
          method: 'post',
          path: '/v3/sprints/100/_start',
          apiVersion: 'v3',
          query: { version: 4 },
        })
        .reply(200, createSprintFixture({ id: 100, version: 4, status: 'in_progress' }));
    },
    input: { sprintId: '100', action: 'start', fields: ['id', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('manage_sprint_lifecycle — режимы archive/delete (path/версия действия отличаются от start)', () => {
  const ctx = useToolIntegrationContext();

  it('archive: без version читает её GET, POST /v3/sprints/{id}/_archive?version=… возвращает архивированный спринт', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/sprints/200', apiVersion: 'v3' })
      .reply(200, createSprintFixture({ id: 200, version: 9 }));
    ctx.api
      .expectRequest({
        method: 'post',
        path: '/v3/sprints/200/_archive',
        apiVersion: 'v3',
        query: { version: 9 },
      })
      .reply(200, createSprintFixture({ id: 200, version: 9, name: 'Sprint 2', archived: true }));

    const result = await ctx.client.callTool(MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.name, {
      sprintId: '200',
      action: 'archive',
      fields: ['id', 'archived'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, ManageSprintLifecycleOutputDataSchema);
    expect(data.sprintId).toBe('200');
    expect(data.action).toBe('archive');
    expect(data.sprint).toEqual({ id: 200, archived: true });
    // Версия не передана — операция дочитала её сама и применила действие без
    // блокировки: ровно тот случай, о котором VERSION_NOT_PROVIDED предупреждает.
    assertWarnings(result, ['VERSION_NOT_PROVIDED']);
    ctx.api.assertAllExpectationsMet();
  });

  it('archive: version передана явно — GET не делается, в URL уходит переданная', async () => {
    ctx.api
      .expectRequest({
        method: 'post',
        path: '/v3/sprints/201/_archive',
        apiVersion: 'v3',
        query: { version: 3 },
      })
      .reply(200, createSprintFixture({ id: 201, version: 4, archived: true }));

    const result = await ctx.client.callTool(MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.name, {
      sprintId: '201',
      action: 'archive',
      version: 3,
      fields: ['id', 'archived'],
    });

    expect(result.isError, JSON.stringify(result)).toBeUndefined();
    const data = assertMatchesOutputSchema(result, ManageSprintLifecycleOutputDataSchema);
    expect(data.sprint).toEqual({ id: 201, archived: true });
    const structured = result['structuredContent'] as { warnings?: unknown };
    expect(structured.warnings).toBeUndefined();
    ctx.api.assertAllExpectationsMet();
  });

  it('delete: DELETE /v3/sprints/{id} без query, отвечает 204 без тела — sprint равен null, без warnings', async () => {
    ctx.api
      .expectRequest({ method: 'delete', path: '/v3/sprints/300', apiVersion: 'v3' })
      .reply(204);

    const result = await ctx.client.callTool(MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.name, {
      sprintId: '300',
      action: 'delete',
      fields: ['id'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, ManageSprintLifecycleOutputDataSchema);
    expect(data.sprintId).toBe('300');
    expect(data.action).toBe('delete');
    expect(data.sprint).toBeNull();
    const structured = result['structuredContent'] as { warnings?: unknown };
    expect(structured.warnings).toBeUndefined();
    ctx.api.assertAllExpectationsMet();
  });

  it('delete: version в параметрах инструмента отклоняется валидацией до HTTP', async () => {
    const result = await ctx.client.callTool(MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.name, {
      sprintId: '300',
      action: 'delete',
      version: 1,
      fields: ['id'],
    });

    expect(result.isError).toBe(true);
    expect(ctx.api.attemptedCount).toBe(0);
  });

  it('start: warnings присутствуют и непусты на обеих проекциях при недостающем поле (регресс для отдельных it())', async () => {
    ctx.api
      .expectRequest({ method: 'get', path: '/v3/sprints/400', apiVersion: 'v3' })
      .reply(200, createSprintFixture({ id: 400, version: 1 }));
    ctx.api
      .expectRequest({
        method: 'post',
        path: '/v3/sprints/400/_start',
        apiVersion: 'v3',
        query: { version: 1 },
      })
      .reply(200, createSprintFixture({ id: 400, version: 1, status: 'in_progress' }));

    const result = await ctx.client.callTool(MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.name, {
      sprintId: '400',
      action: 'start',
      fields: ['id', 'missingField'],
    });

    expect(result.isError).toBeUndefined();
    // Версия тоже не передана — оба предупреждения независимы и оба обязаны прийти.
    assertWarnings(result, ['FIELDS_WITHOUT_VALUE', 'VERSION_NOT_PROVIDED']);
    ctx.api.assertAllExpectationsMet();
  });
});

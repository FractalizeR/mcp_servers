/**
 * Категория `sprints` целиком в реестре исключений живых прогонов (спринты
 * принадлежат доске — `tests/TESTING_STRATEGY.md` §1): С-4 здесь `мок (гипотеза)`,
 * а не `мок`. Пути и версии сверены с официальной документацией Яндекс.Трекера —
 * см. `manage-sprint-lifecycle.operation.ts` и отчёт пакета P5.
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
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v3/sprints/100/_start', apiVersion: 'v3' }],

  happyPath: {
    input: { sprintId: '100', action: 'start' },
    arrange: (api) => {
      api
        .expectRequest({ method: 'post', path: '/v3/sprints/100/_start', apiVersion: 'v3' })
        .reply(200, createSprintFixture({ id: '100', name: 'Sprint 1', status: 'in_progress' }));
    },
    outputDataSchema: ManageSprintLifecycleOutputDataSchema,
    assertData: (data) => {
      expect(data.sprintId).toBe('100');
      expect(data.action).toBe('start');
      expect(data.sprint).toMatchObject({ id: '100', status: 'in_progress' });
      expect(data.message).toContain('100');
    },
  },

  invalidInput: {
    // `action` — замкнутый enum ('start' | 'archive' | 'delete'); значение вне
    // перечисления отклоняется до HTTP.
    input: { sprintId: '100', action: 'pause' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/sprints/100/_start', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { sprintId: '100', action: 'start' },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/sprints/100/_start', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { sprintId: '100', action: 'start' },
    },
  },

  // Единичное действие над одним спринтом — batch-режима нет.
  batch: 'not-applicable',

  // Не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  // Инструмент не принимает `fields` и не фильтрует ответ через
  // ResponseFieldFilter (см. manage-sprint-lifecycle.tool.ts) — предупреждения
  // физически недостижимы.
  warnings: 'not-applicable',
});

describe('manage_sprint_lifecycle — режимы archive/delete (path/версия действия отличаются от start)', () => {
  const ctx = useToolIntegrationContext();

  it('archive: POST /v3/sprints/{id}/_archive возвращает архивированный спринт', async () => {
    ctx.api
      .expectRequest({ method: 'post', path: '/v3/sprints/200/_archive', apiVersion: 'v3' })
      .reply(200, createSprintFixture({ id: '200', name: 'Sprint 2', archived: true }));

    const result = await ctx.client.callTool(MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.name, {
      sprintId: '200',
      action: 'archive',
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, ManageSprintLifecycleOutputDataSchema);
    expect(data.sprintId).toBe('200');
    expect(data.action).toBe('archive');
    expect(data.sprint).toMatchObject({ id: '200', archived: true });
    ctx.api.assertAllExpectationsMet();
  });

  it('delete: DELETE /v3/sprints/{id} отвечает 204 без тела — sprint равен null', async () => {
    ctx.api
      .expectRequest({ method: 'delete', path: '/v3/sprints/300', apiVersion: 'v3' })
      .reply(204);

    const result = await ctx.client.callTool(MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.name, {
      sprintId: '300',
      action: 'delete',
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, ManageSprintLifecycleOutputDataSchema);
    expect(data.sprintId).toBe('300');
    expect(data.action).toBe('delete');
    expect(data.sprint).toBeNull();
    ctx.api.assertAllExpectationsMet();
  });
});

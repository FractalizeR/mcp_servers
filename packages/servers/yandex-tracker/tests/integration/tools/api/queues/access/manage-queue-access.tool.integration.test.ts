/**
 * Интеграционные тесты для `manage_queue_access` на фабрике `describeToolIntegration`.
 *
 * Сторона ответа переписана пакетом C2 после живого наблюдения 2026-08-26: `PATCH
 * /v3/queues/{queueId}/permissions` отдаёт объект, ключёванный разрешением
 * (`{self, version, create?, write?, read?, grant?, deny?}`), а не массив —
 * `.agentic-planning/plan_tracker_sweep7_fixes/inventory/queue-permissions-response-2026-08-26.json`.
 * Прежняя типизация (`z.array(FilteredEntitySchema)`) отвергалась MCP-клиентом на
 * границе схемы (`data/data/permissions must be array`) — инструмент был нерабочим.
 *
 * `deny` живьём не наблюдался (см. `queue-permission.entity.ts`) — используется как
 * пример поля, отсутствующего в ответе, для кейса `FIELDS_WITHOUT_VALUE` ниже.
 */

import { describe, expect, it } from 'vitest';
import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createVersionOnlyQueuePermissionsFixture } from '#helpers/queue-permission.fixture.js';
import { MANAGE_QUEUE_ACCESS_TOOL_METADATA } from '#tools/api/queues/manage-queue-access.metadata.js';
import { ManageQueueAccessOutputDataSchema } from '#tools/api/queues/manage-queue-access.schema.js';
import { STANDARD_QUEUE_PERMISSION_FIELDS } from '#helpers/test-fields.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
} from '#integration/helpers/tool-integration-suite.js';

const BASE_INPUT = {
  queueId: 'TEST',
  action: 'add' as const,
  subjects: ['testuser'],
  permission: 'write' as const,
  subjectKind: 'users' as const,
};

const PERMISSIONS_PATH = '/v3/queues/TEST/permissions';

describeToolIntegration({
  tool: MANAGE_QUEUE_ACCESS_TOOL_METADATA.name,

  expectedRequests: [{ method: 'patch', path: PERMISSIONS_PATH, apiVersion: 'v3' }],

  happyPath: {
    // `PATCH .../permissions` живьём отвечает ТОЛЬКО `{self, version}` — живая проба
    // 2026-08-26 (`queue-permission.entity.ts`). Мок happy path обязан отражать эту
    // форму, а не полный набор разрешений, который PATCH никогда не возвращает;
    // полную форму фильтрации покрывает unit-тест
    // `manage-queue-access.tool.test.ts` («…объектом, ключёванным разрешением…»).
    input: { ...BASE_INPUT, fields: ['self', 'version'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: PERMISSIONS_PATH,
          apiVersion: 'v3',
          body: { write: { users: { add: ['testuser'] } } },
        })
        .reply(200, createVersionOnlyQueuePermissionsFixture());
    },
    outputDataSchema: ManageQueueAccessOutputDataSchema,
    assertData: (data) => {
      expect(Array.isArray(data.permissions)).toBe(false);
      const permissions = data.permissions as { self: string; version: number };
      expect(permissions.self).toBeDefined();
      expect(permissions.version).toBeDefined();
      expect(data.subjectsSent).toBe(1);
    },
  },

  invalidInput: {
    // permission вне справочника (queue-lead ролью запроса не является) —
    // отклоняется схемой до HTTP.
    input: { ...BASE_INPUT, permission: 'queue-lead' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: PERMISSIONS_PATH, apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { ...BASE_INPUT, fields: [...STANDARD_QUEUE_PERMISSION_FIELDS] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: PERMISSIONS_PATH, apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { ...BASE_INPUT, fields: [...STANDARD_QUEUE_PERMISSION_FIELDS] },
    },
  },

  // manage_queue_access — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // `STANDARD_QUEUE_PERMISSION_FIELDS` — тот набор полей, который агент запросит
    // по умолчанию (включает `write.users.display`). PATCH живьём отвечает только
    // `{self, version}`, поэтому в бою этот вызов ВСЕГДА даёт FIELDS_WITHOUT_VALUE —
    // не частный случай `deny`, а следствие формы ответа.
    arrange: (api) => {
      api
        .expectRequest({ method: 'patch', path: PERMISSIONS_PATH, apiVersion: 'v3' })
        .reply(200, createVersionOnlyQueuePermissionsFixture());
    },
    input: { ...BASE_INPUT, fields: [...STANDARD_QUEUE_PERMISSION_FIELDS] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe(`${MANAGE_QUEUE_ACCESS_TOOL_METADATA.name} — ответ без единого разрешения`, () => {
  const ctx = useToolIntegrationContext();

  it('переживает ответ {self, version} без исключения (форма смоука референсного клиента)', async () => {
    ctx.api
      .expectRequest({
        method: 'patch',
        path: PERMISSIONS_PATH,
        apiVersion: 'v3',
        body: { write: { users: { add: ['testuser'] } } },
      })
      .reply(200, createVersionOnlyQueuePermissionsFixture());

    const result = await ctx.client.callTool(MANAGE_QUEUE_ACCESS_TOOL_METADATA.name, {
      ...BASE_INPUT,
      fields: ['self', 'version'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, ManageQueueAccessOutputDataSchema);
    const permissions = data.permissions as { self: string; version: number };
    expect(permissions.version).toBe(11);
    ctx.api.assertAllExpectationsMet();
  });
});

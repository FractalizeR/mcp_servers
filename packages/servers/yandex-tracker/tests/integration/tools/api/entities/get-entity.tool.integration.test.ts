/**
 * Интеграционный тест `get_entity` на фабрике `describeToolIntegration`
 * (план 2.1.2, пакет P2). Entity API в реестре исключений живых прогонов
 * (`tests/TESTING_STRATEGY.md` §1).
 *
 * API: `GET /v3/entities/{entityType}/{entityId}` — подтверждено официальной
 * документацией (yandex.ru/support/tracker/en/api-ref/entities/get-entity).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createEntityApiRecordFixture } from '#helpers/entity-api.fixture.js';
import { GET_ENTITY_TOOL_METADATA } from '#tools/api/entities/get-entity.metadata.js';
import { GetEntityOutputDataSchema } from '#tools/api/entities/get-entity.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertContractualError,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

// `buildEntityQuery` (`entity-query.util.ts`) вшивает MCP-проекцию `fields` в
// query как `?fields=<имя>[,<имя>...]` — обязателен, иначе Entity API не
// отдаёт объект `fields` записи вовсе (см. `entity-api-fields.util.ts`).
describeToolIntegration({
  tool: GET_ENTITY_TOOL_METADATA.name,

  expectedRequests: [
    {
      method: 'get',
      path: '/v3/entities/goal/GOAL-1',
      apiVersion: 'v3',
      query: { fields: 'summary' },
    },
  ],

  happyPath: {
    input: { entityType: 'goal', entityId: 'GOAL-1', fields: ['fields.summary'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'get',
          path: '/v3/entities/goal/GOAL-1',
          apiVersion: 'v3',
          query: { fields: 'summary' },
        })
        .reply(
          200,
          createEntityApiRecordFixture({
            id: 'GOAL-1',
            entityType: 'goal',
            fields: { summary: 'Goal X' },
          })
        );
    },
    outputDataSchema: GetEntityOutputDataSchema,
    assertData: (data) => {
      // `fields` — единственное запрошенное имя ('fields.summary'), поэтому
      // отфильтрованная запись состоит только из него.
      expect(data.entity).toMatchObject({ fields: { summary: 'Goal X' } });
    },
  },

  invalidInput: {
    // fields обязателен (не optional) — GetEntityParamsSchema.
    input: { entityType: 'goal', entityId: 'GOAL-1' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'get',
            path: '/v3/entities/goal/GOAL-1',
            apiVersion: 'v3',
            query: { fields: 'summary' },
          })
          .reply(403, generateError403());
      },
      input: { entityType: 'goal', entityId: 'GOAL-1', fields: ['fields.summary'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'get',
            path: '/v3/entities/goal/GOAL-1',
            apiVersion: 'v3',
            query: { fields: 'summary' },
          })
          .reply(404, generateError404());
      },
      input: { entityType: 'goal', entityId: 'GOAL-1', fields: ['fields.summary'] },
    },
  },

  batch: 'not-applicable',
  pagination: 'none',

  warnings: {
    // "fields.priority" — допущение: см. комментарий в create-entity об
    // отсутствии документированного набора полей goal кроме `summary`.
    // Легитимное имя, просто не заполненное в ЭТОМ ответе — в отличие от
    // несуществующего имени, которое приводит к 422 (см. отдельный тест ниже).
    arrange: (api) => {
      api
        .expectRequest({
          method: 'get',
          path: '/v3/entities/goal/GOAL-1',
          apiVersion: 'v3',
          query: { fields: 'summary,priority' },
        })
        .reply(
          200,
          createEntityApiRecordFixture({
            id: 'GOAL-1',
            entityType: 'goal',
            fields: { summary: 'Goal X' },
          })
        );
    },
    input: {
      entityType: 'goal',
      entityId: 'GOAL-1',
      fields: ['fields.summary', 'fields.priority'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe(`${GET_ENTITY_TOOL_METADATA.name} — неизвестное имя поля в проекции`, () => {
  const ctx = useToolIntegrationContext();

  it('несуществующее имя в "fields.<name>" API отклоняет явной 422, а не тихим 200', async () => {
    // Наблюдённый факт живой пробой (докблок `entity-api-fields.util.ts`): 200 с
    // пустым значением на таком входе недостижим — API отвечает 422.
    ctx.api
      .expectRequest({
        method: 'get',
        path: '/v3/entities/goal/GOAL-1',
        apiVersion: 'v3',
        query: { fields: 'summary,unknownField' },
      })
      .reply(422, {
        statusCode: 422,
        errorMessages: ['Field(s) [unknownField] do not exist'],
        errors: {},
      });

    const result = await ctx.client.callTool(GET_ENTITY_TOOL_METADATA.name, {
      entityType: 'goal',
      entityId: 'GOAL-1',
      fields: ['fields.summary', 'fields.unknownField'],
    });

    expect(result.isError).toBe(true);
    assertContractualError(result, 422);
  });
});

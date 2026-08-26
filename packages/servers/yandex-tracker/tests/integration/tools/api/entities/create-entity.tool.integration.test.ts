/**
 * Интеграционный тест `create_entity` на фабрике `describeToolIntegration`
 * (план 2.1.2, пакет P2). Записей в реестре живых наблюдений
 * (`tests/coverage-exceptions/live-observations.ts`) на Entity API нет — С-4 в матрице
 * `мок (гипотеза)`. Категорийного «живьём не наблюдается никогда» больше нет вовсе:
 * `tests/TESTING_STRATEGY.md` §1 — источник ПРИЧИНЫ, реестр — источник СПИСКА.
 *
 * API: `POST /v3/entities/{entityType}` с телом `{ fields: { summary, ... } }` —
 * подтверждено официальной документацией
 * (yandex.ru/support/tracker/en/api-ref/entities/create-entity).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createEntityApiRecordFixture } from '#helpers/entity-api.fixture.js';
import { CREATE_ENTITY_TOOL_METADATA } from '#tools/api/entities/create-entity.metadata.js';
import { CreateEntityOutputDataSchema } from '#tools/api/entities/create-entity.schema.js';
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
  tool: CREATE_ENTITY_TOOL_METADATA.name,

  expectedRequests: [
    { method: 'post', path: '/v3/entities/goal', apiVersion: 'v3', query: { fields: 'summary' } },
  ],

  happyPath: {
    input: { entityType: 'goal', extraFields: { summary: 'Goal X' }, fields: ['fields.summary'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/entities/goal',
          apiVersion: 'v3',
          query: { fields: 'summary' },
          body: { fields: { summary: 'Goal X' } },
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
    outputDataSchema: CreateEntityOutputDataSchema,
    assertData: (data) => {
      // `fields` — единственное запрошенное имя ('fields.summary'), поэтому
      // отфильтрованная запись состоит только из него (ResponseFieldFilter не
      // подмешивает 'id', если он не запрошен явно).
      expect(data.entity).toMatchObject({ fields: { summary: 'Goal X' } });
      expect(data.message).toContain('создана');
    },
  },

  invalidInput: {
    // extraFields обязателен (не optional) — CreateEntityParamsSchema.
    input: { entityType: 'goal', fields: ['fields.summary'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'post',
            path: '/v3/entities/goal',
            apiVersion: 'v3',
            query: { fields: 'summary' },
          })
          .reply(403, generateError403());
      },
      input: { entityType: 'goal', extraFields: { summary: 'Goal X' }, fields: ['fields.summary'] },
    },
    notFound: {
      // Единственный HTTP-вызов create_entity — POST /v3/entities/{type}; кейс
      // проверяет только маппинг статуса 404 → контрактная ошибка, без
      // предположений о том, какой именно ссылке в теле API отказал.
      arrange: (api) => {
        api
          .expectRequest({
            method: 'post',
            path: '/v3/entities/goal',
            apiVersion: 'v3',
            query: { fields: 'summary' },
          })
          .reply(404, generateError404());
      },
      input: { entityType: 'goal', extraFields: { summary: 'Goal X' }, fields: ['fields.summary'] },
    },
  },

  // Единичная операция создания, batch-режима нет.
  batch: 'not-applicable',

  // Не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // "fields.priority" — допущение: Entity API не документирует набор полей
    // goal кроме обязательного `summary` (см. `entity-api.entity.ts`), поэтому
    // здесь это представитель ЛЕГИТИМНОГО имени поля, которое просто не
    // заполнено в ЭТОМ конкретном ответе — в отличие от несуществующего имени,
    // которое приводит к 422 (см. отдельный тест ниже), а не к 200 с пустым
    // значением.
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/entities/goal',
          apiVersion: 'v3',
          query: { fields: 'summary,priority' },
        })
        .reply(
          200,
          createEntityApiRecordFixture({
            id: 'GOAL-2',
            entityType: 'goal',
            fields: { summary: 'Goal With Gaps' },
          })
        );
    },
    input: {
      entityType: 'goal',
      extraFields: { summary: 'Goal With Gaps' },
      fields: ['fields.summary', 'fields.priority'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe(`${CREATE_ENTITY_TOOL_METADATA.name} — неизвестное имя поля в проекции`, () => {
  const ctx = useToolIntegrationContext();

  it('несуществующее имя в "fields.<name>" API отклоняет явной 422, а не тихим 200', async () => {
    // Наблюдённый факт живой пробой (докблок `entity-api-fields.util.ts`): Entity
    // API отвечает 422 «поля [x] не существуют» на неизвестное имя, а НЕ 200 с
    // пустым значением поля — 200 на таком входе недостижим, это закрепляет
    // именно недостижимость, а не выбор одного из двух равнозначных исходов.
    ctx.api
      .expectRequest({
        method: 'post',
        path: '/v3/entities/goal',
        apiVersion: 'v3',
        query: { fields: 'summary,unknownField' },
      })
      .reply(422, {
        statusCode: 422,
        errorMessages: ['Field(s) [unknownField] do not exist'],
        errors: {},
      });

    const result = await ctx.client.callTool(CREATE_ENTITY_TOOL_METADATA.name, {
      entityType: 'goal',
      extraFields: { summary: 'Goal X' },
      fields: ['fields.summary', 'fields.unknownField'],
    });

    expect(result.isError).toBe(true);
    assertContractualError(result, 422);
  });
});

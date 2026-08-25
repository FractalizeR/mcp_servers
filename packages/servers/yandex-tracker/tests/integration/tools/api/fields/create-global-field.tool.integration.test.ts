/**
 * Интеграционный тест `create_global_field` на фабрике `describeToolIntegration`.
 *
 * Категория `api/fields` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — С-4 здесь `мок (гипотеза)`.
 *
 * Путь — `POST /v3/fields` (миграция 4.1, маршрут коллекции — `inventory/
 * v2-paths-2026-08-24.md`). Официальная документация (`api-ref/issues/create-field.md`)
 * называет тот же метод и при этом описывает другую форму тела (`name` —
 * локализуемый объект `{en, ru}`, обязательный `category`, `type` вместо
 * `schema.type`) — расхождение зафиксировано, здесь проверяется фактическое
 * поведение кода; мутации вне очереди `TEST` этапом 4.1 не делаются, форма тела
 * на записи не наблюдалась живьём.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createGlobalFieldFixture } from '#helpers/global-fields.fixture.js';
import { CREATE_GLOBAL_FIELD_TOOL_METADATA } from '#tools/api/fields/create-global-field.metadata.js';
import { CreateGlobalFieldOutputDataSchema } from '#tools/api/fields/create-global-field.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

describeToolIntegration({
  tool: CREATE_GLOBAL_FIELD_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v3/fields', apiVersion: 'v3' }],

  happyPath: {
    input: {
      name: 'Custom Priority',
      schema: { type: 'string' },
      fields: ['id', 'name'],
    },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/fields',
          apiVersion: 'v3',
          body: { name: 'Custom Priority', schema: { type: 'string' } },
        })
        .reply(200, createGlobalFieldFixture({ id: 'customPriority', name: 'Custom Priority' }));
    },
    outputDataSchema: CreateGlobalFieldOutputDataSchema,
    assertData: (data) => {
      expect(data.globalField).toMatchObject({ id: 'customPriority', name: 'Custom Priority' });
      expect(data.message).toContain('customPriority');
    },
  },

  invalidInput: {
    // `schema` обязательна (не optional) — CreateGlobalFieldParamsSchema.
    input: { name: 'Field without schema', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/fields', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { name: 'Restricted Field', schema: { type: 'string' }, fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов create_global_field — POST /v3/fields; 404 здесь
      // проверяет маппинг статуса в контрактную ошибку, без привязки к конкретной
      // причине отказа API (сама причина 404 у POST-эндпоинта не подтверждена ни
      // документацией, ни референсным клиентом — см. докблок файла).
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/fields', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { name: 'Field with bad provider', schema: { type: 'string' }, fields: ['id'] },
    },
  },

  // create_global_field — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Создание поля не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // Ответ не содержит запрошенное поле "missingField" —
    // ResponseFieldFilter отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({ method: 'post', path: '/v3/fields', apiVersion: 'v3' })
        .reply(200, createGlobalFieldFixture({ id: 'customGap', name: 'Field With Gaps' }));
    },
    input: {
      name: 'Field With Gaps',
      schema: { type: 'string' },
      fields: ['id', 'name', 'missingField'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('create_global_field — явный false у optional-boolean (readonly/suggest)', () => {
  const ctx = useToolIntegrationContext();

  it('readonly:false и suggest:false доходят до тела запроса, а не теряются как undefined', async () => {
    ctx.api
      .expectRequest({
        method: 'post',
        path: '/v3/fields',
        apiVersion: 'v3',
        // `false` — валидное явное значение, а не «параметр не передан»: если бы
        // CreateGlobalFieldTool отбрасывал falsy-boolean вместо undefined, тело
        // запроса не содержало бы эти ключи и сравнение ниже провалилось бы.
        body: {
          name: 'Explicit False Flags',
          schema: { type: 'string' },
          readonly: false,
          suggest: false,
        },
      })
      .reply(200, createGlobalFieldFixture({ id: 'explicitFalse', name: 'Explicit False Flags' }));

    const result = await ctx.client.callTool(CREATE_GLOBAL_FIELD_TOOL_METADATA.name, {
      name: 'Explicit False Flags',
      schema: { type: 'string' },
      readonly: false,
      suggest: false,
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    assertMatchesOutputSchema(result, CreateGlobalFieldOutputDataSchema);
    ctx.api.assertAllExpectationsMet();
  });
});

/**
 * Интеграционный тест `create_global_field` на фабрике `describeToolIntegration`.
 *
 * Категория `api/fields` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — С-4 здесь `мок (гипотеза)`.
 *
 * Путь и форма тела — `POST /v3/fields` (D10, `.agentic-planning/
 * plan_tracker_fix_create_tools/0_CONTRACTS.md`): `id`/`name{en,ru}`/`category`/`type`
 * обязательны, ключа `schema` в запросе нет (приходит только в ответе). Мутации вне
 * очереди `TEST` этапом 4.1 не делаются, форма тела на записи вживую не наблюдалась.
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

const BASE_INPUT = {
  id: 'customPriority',
  name: { en: 'Custom Priority', ru: 'Пользовательский приоритет' },
  category: 'category1',
  type: 'ru.yandex.startrek.core.fields.StringFieldType',
};

describeToolIntegration({
  tool: CREATE_GLOBAL_FIELD_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v3/fields', apiVersion: 'v3' }],

  happyPath: {
    input: { ...BASE_INPUT, fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/fields',
          apiVersion: 'v3',
          body: BASE_INPUT,
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
    // `category` обязательна (не optional) — CreateGlobalFieldParamsSchema.
    input: { id: 'customPriority', name: BASE_INPUT.name, type: BASE_INPUT.type, fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/fields', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { ...BASE_INPUT, fields: ['id'] },
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
      input: { ...BASE_INPUT, fields: ['id'] },
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
      ...BASE_INPUT,
      fields: ['id', 'name', 'missingField'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('create_global_field — явный false у optional-boolean (readonly/visible/hidden/container)', () => {
  const ctx = useToolIntegrationContext();

  it('readonly:false и container:false доходят до тела запроса, а не теряются как undefined', async () => {
    ctx.api
      .expectRequest({
        method: 'post',
        path: '/v3/fields',
        apiVersion: 'v3',
        // `false` — валидное явное значение, а не «параметр не передан»: если бы
        // CreateGlobalFieldTool отбрасывал falsy-boolean вместо undefined, тело
        // запроса не содержало бы эти ключи и сравнение ниже провалилось бы.
        body: {
          ...BASE_INPUT,
          readonly: false,
          container: false,
        },
      })
      .reply(200, createGlobalFieldFixture({ id: 'explicitFalse', name: 'Explicit False Flags' }));

    const result = await ctx.client.callTool(CREATE_GLOBAL_FIELD_TOOL_METADATA.name, {
      ...BASE_INPUT,
      readonly: false,
      container: false,
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    assertMatchesOutputSchema(result, CreateGlobalFieldOutputDataSchema);
    ctx.api.assertAllExpectationsMet();
  });
});

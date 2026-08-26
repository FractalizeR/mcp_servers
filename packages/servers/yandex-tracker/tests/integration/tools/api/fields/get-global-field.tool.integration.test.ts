/**
 * Интеграционный тест `get_global_field` на фабрике `describeToolIntegration`.
 *
 * Живьём инструменты глобальных полей не наблюдались (реестр
 * `tests/coverage-exceptions/live-observations.ts`) — С-4 здесь `мок (гипотеза)`.
 *
 * Путь — `GET /v3/fields/{fieldId}` (миграция 4.1). Документация не описывает получение
 * ОДНОГО поля отдельным разделом; v3 подтверждён read-only оракулом маршрутов
 * (`GET /v3/fields/queue` → 200, `inventory/v2-paths-2026-08-24.md`).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createGlobalFieldFixture } from '#helpers/global-fields.fixture.js';
import { GET_GLOBAL_FIELD_TOOL_METADATA } from '#tools/api/fields/get-global-field.metadata.js';
import { GetGlobalFieldOutputDataSchema } from '#tools/api/fields/get-global-field.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: GET_GLOBAL_FIELD_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' }],

  happyPath: {
    input: { fieldId: 'customField123', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' })
        .reply(200, createGlobalFieldFixture({ id: 'customField123', name: 'Custom Priority' }));
    },
    outputDataSchema: GetGlobalFieldOutputDataSchema,
    assertData: (data) => {
      expect(data.globalField).toMatchObject({ id: 'customField123', name: 'Custom Priority' });
    },
  },

  invalidInput: {
    // `fieldId` обязателен и не может быть пустой строкой — GetGlobalFieldParamsSchema.
    input: { fieldId: '', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { fieldId: 'customField123', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов get_global_field — GET /v3/fields/{fieldId}; 404
      // здесь — та же операция, отвечающая «поле не найдено».
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { fieldId: 'customField123', fields: ['id'] },
    },
  },

  // Одиночное чтение по ID — batch-режима у него нет.
  batch: 'not-applicable',

  // Одиночная сущность, не список — пагинация неприменима.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/fields/customField123', apiVersion: 'v3' })
        .reply(200, createGlobalFieldFixture({ id: 'customField123', name: 'Custom Priority' }));
    },
    input: { fieldId: 'customField123', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

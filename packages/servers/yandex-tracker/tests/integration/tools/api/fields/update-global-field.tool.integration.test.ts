/**
 * Интеграционный тест `update_global_field` на фабрике `describeToolIntegration`.
 *
 * Категория `api/fields` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — С-4 здесь `мок (гипотеза)`.
 *
 * Сверка с внешним источником истины: референсный клиент (`Fields.path`, `update()`
 * → `PATCH` на `obj._path`, `api_version` по умолчанию `v2`) подтверждает
 * `PATCH /v2/fields/{fieldId}`. Официальная документация описывает переименование
 * поля как `PATCH /v3/fields/{id}?version=...` (`api-ref/issues/patch-issue-field-name.md`)
 * — другая версия API и обязательный query-параметр `version` (optimistic locking),
 * которого в нашей операции нет вовсе — расхождение с обоими источниками записано в
 * отчёт пакета, здесь фиксируется фактическое поведение кода.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createGlobalFieldFixture } from '#helpers/global-fields.fixture.js';
import { UPDATE_GLOBAL_FIELD_TOOL_METADATA } from '#tools/api/fields/update-global-field.metadata.js';
import { UpdateGlobalFieldOutputDataSchema } from '#tools/api/fields/update-global-field.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: UPDATE_GLOBAL_FIELD_TOOL_METADATA.name,

  expectedRequests: [{ method: 'patch', path: '/v2/fields/customField123', apiVersion: 'v2' }],

  happyPath: {
    input: { fieldId: 'customField123', name: 'Renamed Priority', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v2/fields/customField123',
          apiVersion: 'v2',
          body: { name: 'Renamed Priority' },
        })
        .reply(200, createGlobalFieldFixture({ id: 'customField123', name: 'Renamed Priority' }));
    },
    outputDataSchema: UpdateGlobalFieldOutputDataSchema,
    assertData: (data) => {
      expect(data.globalField).toMatchObject({ id: 'customField123', name: 'Renamed Priority' });
    },
  },

  invalidInput: {
    // `name`, если передан, не может быть пустой строкой — UpdateGlobalFieldParamsSchema.
    input: { fieldId: 'customField123', name: '', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: '/v2/fields/customField123', apiVersion: 'v2' })
          .reply(403, generateError403());
      },
      input: { fieldId: 'customField123', name: 'Restricted Rename', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов update_global_field — PATCH /v2/fields/{fieldId};
      // 404 здесь — та же операция, отвечающая «поле не найдено».
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: '/v2/fields/customField123', apiVersion: 'v2' })
          .reply(404, generateError404());
      },
      input: { fieldId: 'customField123', name: 'Rename Missing', fields: ['id'] },
    },
  },

  // Одиночная операция обновления — batch-режима у неё нет.
  batch: 'not-applicable',

  // Не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    arrange: (api) => {
      api
        .expectRequest({ method: 'patch', path: '/v2/fields/customField123', apiVersion: 'v2' })
        .reply(200, createGlobalFieldFixture({ id: 'customField123', name: 'Field With Gaps' }));
    },
    input: {
      fieldId: 'customField123',
      name: 'Field With Gaps',
      fields: ['id', 'name', 'missingField'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

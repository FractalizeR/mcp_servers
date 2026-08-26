/**
 * Интеграционный тест `update_global_field` на фабрике `describeToolIntegration`.
 *
 * Живьём `update_global_field` не наблюдался и сегодня недостижим: реестр
 * (`tests/coverage-exceptions/live-observations.ts`) несёт на него `LiveUnreachable`
 * с причиной D10 — С-4 здесь `мок (гипотеза)`, С-5 — `исключение`. Причина и условие
 * её снятия печатаются разделом «С-4: живой прогон недостижим» в `COVERAGE_MATRIX.md`.
 *
 * Путь — `PATCH /v3/fields/{fieldId}` (миграция 4.1, маршрут ресурса — `inventory/
 * v2-paths-2026-08-24.md`). Референсный клиент подтверждает метод `PATCH`
 * (`collections.py:188`); документация (`api-ref/issues/patch-issue-field-name.md`)
 * описывает переименование как `PATCH /v3/fields/{id}?version=...`, но
 * оптимистичную блокировку этап 4.1 сознательно не вводит (план, «Решения»,
 * п.2) — `version` в query здесь нет, и это не расхождение, а принятое решение.
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

  expectedRequests: [{ method: 'patch', path: '/v3/fields/customField123', apiVersion: 'v3' }],

  happyPath: {
    input: { fieldId: 'customField123', name: 'Renamed Priority', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/fields/customField123',
          apiVersion: 'v3',
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
          .expectRequest({ method: 'patch', path: '/v3/fields/customField123', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { fieldId: 'customField123', name: 'Restricted Rename', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов update_global_field — PATCH /v3/fields/{fieldId};
      // 404 здесь — та же операция, отвечающая «поле не найдено».
      arrange: (api) => {
        api
          .expectRequest({ method: 'patch', path: '/v3/fields/customField123', apiVersion: 'v3' })
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
        .expectRequest({ method: 'patch', path: '/v3/fields/customField123', apiVersion: 'v3' })
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

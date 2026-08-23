/**
 * Интеграционный тест `get_global_field` на фабрике `describeToolIntegration`.
 *
 * Категория `api/fields` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`) — С-4 здесь `мок (гипотеза)`.
 *
 * Сверка с внешним источником истины: референсный клиент (`Fields.path =
 * '/{api_version}/fields/{id}'`, `get()` → `get_all()` → `GET`, `api_version` по
 * умолчанию `v2`) подтверждает `GET /v2/fields/{fieldId}`. Официальная документация
 * не описывает получение ОДНОГО поля по ID отдельным методом — только список
 * (`GET /v3/fields`, см. `create-global-field`/`get-global-fields` тесты) — путь
 * этого конкретного инструмента подтверждён только референсным клиентом, версия
 * (`v2` кода против `v3` списка в документации) — та же гипотеза, что и у соседних
 * инструментов пакета; расхождение записано в отчёт.
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

  expectedRequests: [{ method: 'get', path: '/v2/fields/customField123', apiVersion: 'v2' }],

  happyPath: {
    input: { fieldId: 'customField123', fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v2/fields/customField123', apiVersion: 'v2' })
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
          .expectRequest({ method: 'get', path: '/v2/fields/customField123', apiVersion: 'v2' })
          .reply(403, generateError403());
      },
      input: { fieldId: 'customField123', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов get_global_field — GET /v2/fields/{fieldId}; 404
      // здесь — та же операция, отвечающая «поле не найдено».
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v2/fields/customField123', apiVersion: 'v2' })
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
        .expectRequest({ method: 'get', path: '/v2/fields/customField123', apiVersion: 'v2' })
        .reply(200, createGlobalFieldFixture({ id: 'customField123', name: 'Custom Priority' }));
    },
    input: { fieldId: 'customField123', fields: ['id', 'name', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

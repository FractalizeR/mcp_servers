/**
 * Интеграционный тест `delete_global_field` на фабрике `describeToolIntegration`.
 *
 * Категория `api/fields` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`, `tests/TESTING_STRATEGY.md`
 * §1: глобальные поля действуют во всей организации, а не в песочнице очереди
 * `TEST`) — С-4 здесь честно `мок (гипотеза)` в матрице, а не `мок`.
 *
 * Путь — `DELETE /v3/fields/{fieldId}` (миграция 4.1). Официальная документация не
 * описывает удаление глобального поля отдельным разделом; v3 принят по маршруту
 * ресурса — тот же путь, что и у задокументированных `GET/PATCH /v3/fields/{id}`
 * (`inventory/v2-paths-2026-08-24.md`, строка delete).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { DELETE_GLOBAL_FIELD_TOOL_METADATA } from '#tools/api/fields/delete-global-field.metadata.js';
import { DeleteGlobalFieldOutputDataSchema } from '#tools/api/fields/delete-global-field.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: DELETE_GLOBAL_FIELD_TOOL_METADATA.name,

  expectedRequests: [{ method: 'delete', path: '/v3/fields/customField123', apiVersion: 'v3' }],

  happyPath: {
    input: { fieldId: 'customField123' },
    arrange: (api) => {
      api
        .expectRequest({ method: 'delete', path: '/v3/fields/customField123', apiVersion: 'v3' })
        .reply(200, {});
    },
    outputDataSchema: DeleteGlobalFieldOutputDataSchema,
    assertData: (data) => {
      expect(data).toMatchObject({ success: true, fieldId: 'customField123' });
      expect(data.message).toContain('customField123');
    },
  },

  invalidInput: {
    // `fieldId` обязателен и не может быть пустой строкой — DeleteGlobalFieldParamsSchema.
    input: { fieldId: '' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'delete', path: '/v3/fields/customField123', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { fieldId: 'customField123' },
    },
    notFound: {
      // Единственный HTTP-вызов delete_global_field — DELETE /v3/fields/{fieldId};
      // 404 здесь — та же операция, отвечающая «поле не найдено».
      arrange: (api) => {
        api
          .expectRequest({ method: 'delete', path: '/v3/fields/customField123', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { fieldId: 'customField123' },
    },
  },

  // Одиночная операция удаления — batch-режима у неё нет.
  batch: 'not-applicable',

  // Не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  // Схема параметров не содержит `fields` — фильтрация ответа и её предупреждения
  // здесь физически недостижимы (нечего фильтровать).
  warnings: 'not-applicable',
});

/**
 * Интеграционный тест `delete_project` на фабрике `describeToolIntegration`.
 *
 * `projects` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`: `api/projects`,
 * `tests/TESTING_STRATEGY.md` §1) — проект принадлежит организации целиком, а не
 * очереди `TEST`. С-4 здесь честно `мок (гипотеза)` в матрице, а не `мок`.
 *
 * Сверка с внешним источником истины (план `2.1.2` §«Пакеты, где мок — единственная
 * проверка»): официальная документация Трекера (`en/api-ref/projects/delete-project`,
 * снято `curl` 2026-08-23) описывает `DELETE /v3/projects/<project_ID>` — версия v3.
 * Референсный `yandex_tracker_client/` (`Projects.path = '/{api_version}/projects/{id}'`,
 * без переопределения `api_version`, дефолт соединения `VERSION_V2`) остаётся на v2 и
 * не мигрирует; код этого пакета после миграции 4.1 — v3 (`DeleteProjectOperation`:
 * `DELETE /v3/projects/{projectId}`). Тест фиксирует НАБЛЮДАЕМОЕ поведение кода (v3) —
 * после миграции 4.1 версия и метод совпадают с документацией; расхождение
 * референсного клиента с обоими не чинится здесь (канон §5).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { DELETE_PROJECT_TOOL_METADATA } from '#tools/api/projects/delete-project.metadata.js';
import { DeleteProjectOutputDataSchema } from '#tools/api/projects/delete-project.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: DELETE_PROJECT_TOOL_METADATA.name,

  expectedRequests: [{ method: 'delete', path: '/v3/projects/project123', apiVersion: 'v3' }],

  happyPath: {
    input: { projectId: 'project123' },
    arrange: (api) => {
      api
        .expectRequest({ method: 'delete', path: '/v3/projects/project123', apiVersion: 'v3' })
        .reply(200, {});
    },
    outputDataSchema: DeleteProjectOutputDataSchema,
    assertData: (data) => {
      expect(data.projectId).toBe('project123');
      expect(data.message).toContain('project123');
    },
  },

  invalidInput: {
    // `projectId` обязателен и не может быть пустым (DeleteProjectParamsSchema).
    input: { projectId: '' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'delete', path: '/v3/projects/project123', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { projectId: 'project123' },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'delete', path: '/v3/projects/project123', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { projectId: 'project123' },
    },
  },

  // delete_project — единичная операция без batch-режима (один projectId за вызов).
  batch: 'not-applicable',

  // Удаление не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  // DeleteProjectOutputDataSchema не содержит fields-зависимых полей — фильтрация
  // ответа не применяется (`delete-project.tool.ts` вызывает `formatSuccess` без
  // `ResponseFieldFilter`), поэтому `FIELDS_WITHOUT_VALUE` физически недостижим.
  warnings: 'not-applicable',
});

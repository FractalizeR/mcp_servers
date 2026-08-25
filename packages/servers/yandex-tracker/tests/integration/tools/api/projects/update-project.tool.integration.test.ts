/**
 * Интеграционный тест `update_project` на фабрике `describeToolIntegration`.
 *
 * `projects` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`: `api/projects`,
 * `tests/TESTING_STRATEGY.md` §1) — проект принадлежит организации целиком. С-4
 * здесь честно `мок (гипотеза)`, а не `мок`.
 *
 * Сверка с внешним источником истины: официальная документация Трекера
 * (`en/api-ref/projects/update-project`, снято `curl` 2026-08-23) описывает
 * `PUT /v3/projects/<project_ID>?version=<version>` — другой HTTP-метод (PUT, не
 * PATCH) и обязательный query-параметр `version` (оптимистичная блокировка),
 * которого в схеме этого инструмента нет вовсе. Референсный `yandex_tracker_client/`
 * (`Projects`, без переопределения `api_version`, дефолт соединения `VERSION_V2`)
 * остаётся на v2 и не мигрирует; код этого пакета после миграции 4.1 — v3
 * (`UpdateProjectOperation`: `PATCH /v3/projects/{projectId}`, без `version`). Тест
 * фиксирует НАБЛЮДАЕМОЕ поведение кода (PATCH v3, без `version`) — версия теперь
 * совпадает с документацией, расхождение по методу и `version` не чинится здесь
 * (канон §5).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createProjectFixture } from '#helpers/project.fixture.js';
import { UPDATE_PROJECT_TOOL_METADATA } from '#tools/api/projects/update-project.metadata.js';
import { UpdateProjectOutputDataSchema } from '#tools/api/projects/update-project.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: UPDATE_PROJECT_TOOL_METADATA.name,

  expectedRequests: [{ method: 'patch', path: '/v3/projects/project123', apiVersion: 'v3' }],

  happyPath: {
    input: { projectId: 'project123', name: 'Updated Name', version: 5, fields: ['id', 'name'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/projects/project123',
          apiVersion: 'v3',
          query: { version: 5 },
          body: { name: 'Updated Name' },
        })
        .reply(200, createProjectFixture({ id: 'project123', name: 'Updated Name' }));
    },
    outputDataSchema: UpdateProjectOutputDataSchema,
    assertData: (data) => {
      expect(data.project).toMatchObject({ id: 'project123', name: 'Updated Name' });
    },
  },

  invalidInput: {
    // `projectId` обязателен и не может быть пустым (UpdateProjectParamsSchema).
    input: { projectId: '', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'patch',
            path: '/v3/projects/project123',
            apiVersion: 'v3',
            query: { version: 5 },
          })
          .reply(403, generateError403());
      },
      input: { projectId: 'project123', name: 'Restricted Update', version: 5, fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({
            method: 'patch',
            path: '/v3/projects/project123',
            apiVersion: 'v3',
            query: { version: 5 },
          })
          .reply(404, generateError404());
      },
      input: { projectId: 'project123', name: 'Missing Project', version: 5, fields: ['id'] },
    },
  },

  // update_project — единичная операция без batch-режима (один projectId за вызов).
  batch: 'not-applicable',

  // Обновление не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // `project` не содержит запрошенное поле "missingField" — ResponseFieldFilter
    // отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({
          method: 'patch',
          path: '/v3/projects/project123',
          apiVersion: 'v3',
          query: { version: 5 },
        })
        .reply(200, createProjectFixture({ id: 'project123', name: 'Updated With Gaps' }));
    },
    input: {
      projectId: 'project123',
      name: 'Updated With Gaps',
      version: 5,
      fields: ['id', 'name', 'missingField'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

/**
 * Интеграционный тест `create_project` на фабрике `describeToolIntegration`.
 *
 * `projects` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`: `api/projects`,
 * `tests/TESTING_STRATEGY.md` §1) — проект принадлежит организации целиком. С-4
 * здесь честно `мок (гипотеза)`, а не `мок`.
 *
 * Сверка с внешним источником истины: официальная документация Трекера
 * (`en/api-ref/projects/create-project`, снято `curl` 2026-08-23) описывает
 * `POST /v3/projects/` (с завершающим слэшом) — версия v3. Референсный
 * `yandex_tracker_client/` (`Projects`, без переопределения `api_version`, дефолт
 * соединения `VERSION_V2`) остаётся на v2 и не мигрирует; код этого пакета после
 * миграции 4.1 — v3, но без завершающего слэша (`CreateProjectOperation`:
 * `POST /v3/projects`). Тест фиксирует НАБЛЮДАЕМОЕ поведение кода (v3, без слэша) —
 * версия теперь совпадает с документацией, расхождение по слэшу и у
 * референсного клиента с обоими не чинится здесь (канон §5).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createProjectFixture } from '#helpers/project.fixture.js';
import { CREATE_PROJECT_TOOL_METADATA } from '#tools/api/projects/create-project.metadata.js';
import { CreateProjectOutputDataSchema } from '#tools/api/projects/create-project.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: CREATE_PROJECT_TOOL_METADATA.name,

  expectedRequests: [{ method: 'post', path: '/v3/projects', apiVersion: 'v3' }],

  happyPath: {
    input: { key: 'NEWPROJ', name: 'New Project', lead: 'lead-user', fields: ['id', 'key'] },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'post',
          path: '/v3/projects',
          apiVersion: 'v3',
          body: { key: 'NEWPROJ', name: 'New Project', lead: 'lead-user' },
        })
        .reply(200, createProjectFixture({ id: 'project42', key: 'NEWPROJ', name: 'New Project' }));
    },
    outputDataSchema: CreateProjectOutputDataSchema,
    assertData: (data) => {
      expect(data.projectKey).toBe('NEWPROJ');
      expect(data.project).toMatchObject({ id: 'project42', key: 'NEWPROJ' });
    },
  },

  invalidInput: {
    // `fields` обязателен (не optional) — FieldsSchema в CreateProjectParamsSchema.
    input: { key: 'NEWPROJ', name: 'New Project', lead: 'lead-user' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/projects', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { key: 'RESTRICTED', name: 'Restricted', lead: 'lead-user', fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов create_project — POST /v3/projects; 404 здесь —
      // та же операция, отвечающая «руководитель проекта не найден».
      arrange: (api) => {
        api
          .expectRequest({ method: 'post', path: '/v3/projects', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { key: 'NOLEAD', name: 'No Lead', lead: 'missing-user', fields: ['id'] },
    },
  },

  // create_project — единичная операция без batch-режима.
  batch: 'not-applicable',

  // Создание проекта не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // `project` не содержит запрошенное поле "missingField" — ResponseFieldFilter
    // отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({ method: 'post', path: '/v3/projects', apiVersion: 'v3' })
        .reply(200, createProjectFixture({ id: 'project43', key: 'GAPPROJ' }));
    },
    input: {
      key: 'GAPPROJ',
      name: 'Project With Gaps',
      lead: 'lead-user',
      fields: ['id', 'key', 'missingField'],
    },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

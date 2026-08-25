/**
 * Интеграционный тест `get_project` на фабрике `describeToolIntegration`.
 *
 * `projects` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`: `api/projects`,
 * `tests/TESTING_STRATEGY.md` §1) — проект принадлежит организации целиком. С-4
 * здесь честно `мок (гипотеза)`, а не `мок`.
 *
 * Сверка с внешним источником истины: официальная документация Трекера
 * (`en/api-ref/projects/get-project`, снято `curl` 2026-08-23) описывает
 * `GET /v3/projects/<project_ID>` — версия v3. Референсный `yandex_tracker_client/`
 * (`Projects`, без переопределения `api_version`, дефолт соединения `VERSION_V2`)
 * остаётся на v2 и не мигрирует; код этого пакета после миграции 4.1 — v3
 * (`GetProjectOperation`: `GET /v3/projects/{projectId}`). Тест фиксирует
 * НАБЛЮДАЕМОЕ поведение кода (v3) — версия и метод теперь совпадают с
 * документацией; расхождение референсного клиента с обоими не чинится здесь
 * (канон §5).
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createProjectFixture } from '#helpers/project.fixture.js';
import { GET_PROJECT_TOOL_METADATA } from '#tools/api/projects/get-project.metadata.js';
import { GetProjectOutputDataSchema } from '#tools/api/projects/get-project.schema.js';
import { describeToolIntegration } from '#integration/helpers/tool-integration-suite.js';
import { expect } from 'vitest';

describeToolIntegration({
  tool: GET_PROJECT_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v3/projects/project123', apiVersion: 'v3' }],

  happyPath: {
    // `expand` покрывается здесь единственным местом на интеграционном уровне для
    // этого инструмента (до ревью волны 2.1.2 не сверялся вовсе).
    input: { projectId: 'project123', fields: ['id', 'key', 'name'], expand: 'transitions' },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'get',
          path: '/v3/projects/project123',
          apiVersion: 'v3',
          query: { expand: 'transitions' },
        })
        .reply(200, createProjectFixture({ id: 'project123', key: 'TESTPROJ' }));
    },
    outputDataSchema: GetProjectOutputDataSchema,
    assertData: (data) => {
      expect(data.project).toMatchObject({ id: 'project123', key: 'TESTPROJ' });
    },
  },

  invalidInput: {
    // `projectId` обязателен и не может быть пустым (GetProjectParamsSchema).
    input: { projectId: '', fields: ['id'] },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/projects/project123', apiVersion: 'v3' })
          .reply(403, generateError403());
      },
      input: { projectId: 'project123', fields: ['id'] },
    },
    notFound: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v3/projects/project123', apiVersion: 'v3' })
          .reply(404, generateError404());
      },
      input: { projectId: 'project123', fields: ['id'] },
    },
  },

  // get_project — единичная операция без batch-режима (один projectId за вызов).
  batch: 'not-applicable',

  // Получение одного проекта не list-эндпоинт — пагинация неприменима.
  pagination: 'none',

  warnings: {
    // `project` не содержит запрошенное поле "missingField" — ResponseFieldFilter
    // отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v3/projects/project123', apiVersion: 'v3' })
        .reply(200, createProjectFixture({ id: 'project123', key: 'TESTPROJ' }));
    },
    input: { projectId: 'project123', fields: ['id', 'key', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

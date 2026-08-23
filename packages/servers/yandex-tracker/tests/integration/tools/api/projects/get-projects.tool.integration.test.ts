/**
 * Интеграционный тест `get_projects` на фабрике `describeToolIntegration`.
 *
 * `projects` целиком в реестре исключений живых прогонов
 * (`tests/coverage-exceptions/live-exempt-categories.ts`: `api/projects`,
 * `tests/TESTING_STRATEGY.md` §1) — проект принадлежит организации целиком. С-4
 * здесь честно `мок (гипотеза)`, а не `мок`.
 *
 * Сверка с внешним источником истины: официальная документация Трекера
 * (`en/api-ref/projects/get-project-list`, снято `curl` 2026-08-23) описывает
 * `GET /v3/projects` — версия v3, не v2. Референсный `yandex_tracker_client/`
 * (`Projects`, без переопределения `api_version`, дефолт соединения `VERSION_V2`) —
 * v2, как и код этого пакета (`GetProjectsOperation`: `GET /v2/projects`). Тест
 * фиксирует НАБЛЮДАЕМОЕ поведение кода (v2) — расхождение с документацией не
 * чинится здесь (канон §5), строка передана оркестратору для `TESTING_STRATEGY.md` §2.
 *
 * Тип постранички — `link` (seekable, `tests/TESTING_STRATEGY.md` §4): `GET
 * /v2/projects` пагинируется через заголовок `Link` (`rel="next"`/`rel="seek"`),
 * `total`/`totalPages` заполняются из `X-Total-Count`/`X-Total-Pages` только когда
 * есть `rel="seek"` (seek-gating, `TrackerPaginator.buildMeta`). `nextCursor` в
 * ответе — производная от `Link`, кодирующая путь следующей страницы
 * (`CURSOR_TAGS.projects`), а не собственный курсорный механизм эндпоинта.
 */

import {
  generateError403,
  generateError404,
} from '#integration/helpers/template-based-generator.js';
import { createProjectListFixture } from '#helpers/project.fixture.js';
import { GET_PROJECTS_TOOL_METADATA } from '#tools/api/projects/get-projects.metadata.js';
import { GetProjectsOutputDataSchema } from '#tools/api/projects/get-projects.schema.js';
import {
  describeToolIntegration,
  useToolIntegrationContext,
  assertMatchesOutputSchema,
  assertNoWarnings,
} from '#integration/helpers/tool-integration-suite.js';
import { describe, it, expect } from 'vitest';

/**
 * `rel="next"` + `rel="seek"` — семантика `/v2/projects` реальной API (см.
 * `pin-projects-link.util.ts`): семейство эндпоинта seekable, поэтому
 * `hasNextPage` не подвержен sanity-поправке F3 (та применяется только к
 * НЕ-seek курсорным ручкам).
 */
const NEXT_AND_SEEK_LINK =
  '<https://api.tracker.yandex.net/v2/projects?perPage=2&page=2>; rel="next", ' +
  '<https://api.tracker.yandex.net/v2/projects?perPage=2{&page}>; rel="seek"';

describeToolIntegration({
  tool: GET_PROJECTS_TOOL_METADATA.name,

  expectedRequests: [{ method: 'get', path: '/v2/projects', apiVersion: 'v2' }],

  happyPath: {
    input: { fields: ['id', 'key'], perPage: 2 },
    arrange: (api) => {
      api
        .expectRequest({
          method: 'get',
          path: '/v2/projects',
          apiVersion: 'v2',
          query: { perPage: 2 },
        })
        .reply(200, createProjectListFixture(2));
    },
    outputDataSchema: GetProjectsOutputDataSchema,
    assertData: (data) => {
      expect(data.count).toBe(2);
      expect(data.projects).toHaveLength(2);
      // С-3 (регрессия «идентификатор потерялся при фильтрации», см. find_issues):
      // конкретный элемент проверяется поимённо, а не только длина массива.
      expect(data.projects[0]).toMatchObject({ id: 'project1', key: 'PROJ1' });
    },
  },

  invalidInput: {
    // `cursor` несовместим с `perPage` (noCursorWithBulkParams, GetProjectsParamsSchema).
    input: { fields: ['id'], perPage: 10, cursor: 'some-cursor' },
  },

  errors: {
    forbidden: {
      arrange: (api) => {
        api
          .expectRequest({ method: 'get', path: '/v2/projects', apiVersion: 'v2' })
          .reply(403, generateError403());
      },
      input: { fields: ['id'] },
    },
    notFound: {
      // Единственный HTTP-вызов get_projects — GET /v2/projects; 404 здесь — та же
      // операция, отвечающая «очередь-фильтр не найдена» (queueId не существует).
      arrange: (api) => {
        api
          .expectRequest({
            method: 'get',
            path: '/v2/projects',
            apiVersion: 'v2',
            query: { queueId: 'MISSING' },
          })
          .reply(404, generateError404());
      },
      input: { fields: ['id'], queueId: 'MISSING' },
    },
  },

  // get_projects — list-эндпоинт без batch-режима (один запрос на вызов).
  batch: 'not-applicable',

  pagination: {
    type: 'link',
    fullPage: {
      input: { fields: ['id', 'key'], perPage: 2 },
      arrange: (api) => {
        api
          .expectRequest({
            method: 'get',
            path: '/v2/projects',
            apiVersion: 'v2',
            query: { perPage: 2 },
          })
          .reply(200, createProjectListFixture(2), {
            link: NEXT_AND_SEEK_LINK,
            'x-total-count': '5',
          });
      },
    },
    partialPage: {
      input: { fields: ['id', 'key'], perPage: 2 },
      arrange: (api) => {
        api
          .expectRequest({
            method: 'get',
            path: '/v2/projects',
            apiVersion: 'v2',
            query: { perPage: 2 },
          })
          .reply(200, createProjectListFixture(1));
      },
    },
  },

  warnings: {
    // `project` не содержит запрошенное поле "missingField" — ResponseFieldFilter
    // отдаёт FIELDS_WITHOUT_VALUE (CLAUDE.md §2.1).
    arrange: (api) => {
      api
        .expectRequest({ method: 'get', path: '/v2/projects', apiVersion: 'v2' })
        .reply(200, createProjectListFixture(1));
    },
    input: { fields: ['id', 'key', 'missingField'] },
    codes: ['FIELDS_WITHOUT_VALUE'],
  },
});

describe('get_projects — организация без проектов (пустой список)', () => {
  const ctx = useToolIntegrationContext();

  it('API возвращает [] ⇒ count:0, пустая проекция, без warnings', async () => {
    ctx.api.expectRequest({ method: 'get', path: '/v2/projects', apiVersion: 'v2' }).reply(200, []);

    const result = await ctx.client.callTool(GET_PROJECTS_TOOL_METADATA.name, {
      fields: ['id', 'key'],
    });

    expect(result.isError).toBeUndefined();
    const data = assertMatchesOutputSchema(result, GetProjectsOutputDataSchema);
    expect(data.count).toBe(0);
    expect(data.projects).toHaveLength(0);
    assertNoWarnings(result);
    ctx.api.assertAllExpectationsMet();
  });
});

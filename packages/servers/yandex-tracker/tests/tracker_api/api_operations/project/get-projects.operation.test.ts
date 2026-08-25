import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure/http/client/mock-http-client.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetProjectsOperation } from '#tracker_api/api_operations/project/get-projects.operation.js';
import { createProjectListFixture } from '#helpers/project.fixture.js';
import { CursorCodec, CURSOR_TAGS, InvalidCursorError } from '#tracker_api/utils/index.js';

const NEXT_LINK = '<https://api.tracker.yandex.net/v3/projects?perPage=100&page=2>; rel="next"';
// Seekable v2: ответ присылает И rel="next", И rel="seek" → total сохраняется.
const NEXT_AND_SEEK_LINK =
  '<https://api.tracker.yandex.net/v3/projects?page=2>; rel="next", ' +
  '<https://api.tracker.yandex.net/v3/projects?{&page}>; rel="seek"';
const SEEK_ONLY_LINK = '<https://api.tracker.yandex.net/v3/projects?{&page}>; rel="seek"';

describe('GetProjectsOperation', () => {
  let operation: GetProjectsOperation;
  let httpClient: MockHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    httpClient = new MockHttpClient();

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new GetProjectsOperation(httpClient, mockCacheManager, mockLogger);
  });

  describe('execute (single-page)', () => {
    it('строит базовый endpoint без параметров', async () => {
      const mockProjects: ProjectWithUnknownFields[] = createProjectListFixture(3);
      httpClient.setResponse('GET', '/v3/projects', mockProjects);

      const result = await operation.execute({});

      expect(result.items).toEqual(mockProjects);
      const history = httpClient.getRequestHistory();
      expect(history[0]?.path).toBe('/v3/projects');
    });

    it('без Link rel=next: hasNextPage=false, fetchedAll=true, без page', async () => {
      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2));

      const result = await operation.execute({});

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.pagesFetched).toBe(1);
      // Курсор-режим: legacy-поле page больше не выставляется.
      expect(result.pagination).not.toHaveProperty('page');
    });

    it('с Link rel=next: hasNextPage=true и появляется nextCursor', async () => {
      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2), {
        link: NEXT_LINK,
      });

      const result = await operation.execute({});

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
      expect(result.pagination.nextCursor).toBeDefined();
    });

    it('seek-режим v2: total берётся из X-Total-Count (а не из длины страницы)', async () => {
      // страница содержит 2 элемента, но реальный total = 137
      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2), {
        link: SEEK_ONLY_LINK,
        'x-total-count': '137',
      });

      const result = await operation.execute({});

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(137);
    });

    it('без X-Total-Count total остаётся undefined (не подделывается)', async () => {
      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2));

      const result = await operation.execute({});

      expect(result.pagination.total).toBeUndefined();
    });

    it('пробрасывает perPage в endpoint (без page)', async () => {
      httpClient.setResponse('GET', '/v3/projects?perPage=100', createProjectListFixture(2));

      await operation.execute({ perPage: 100 });

      expect(httpClient.getRequestHistory()[0]?.path).toBe('/v3/projects?perPage=100');
    });

    it('пробрасывает expand', async () => {
      httpClient.setResponse('GET', '/v3/projects?expand=queues', createProjectListFixture(1));

      await operation.execute({ expand: 'queues' });

      expect(httpClient.getRequestHistory()[0]?.path).toBe('/v3/projects?expand=queues');
    });

    it('пробрасывает queueId-фильтр', async () => {
      httpClient.setResponse('GET', '/v3/projects?queueId=QUEUE1', createProjectListFixture(1));

      await operation.execute({ queueId: 'QUEUE1' });

      expect(httpClient.getRequestHistory()[0]?.path).toBe('/v3/projects?queueId=QUEUE1');
    });
  });

  describe('execute (cursor)', () => {
    it('seek-режим: nextCursor декодируется в next-путь', async () => {
      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2), {
        link: NEXT_AND_SEEK_LINK,
        'x-total-count': '137',
      });

      const result = await operation.execute({});

      expect(result.pagination.total).toBe(137);
      const decoded = CursorCodec.decode(
        result.pagination.nextCursor as string,
        CURSOR_TAGS.projects
      );
      expect(decoded.path).toBe('/v3/projects?page=2');
    });

    it('повторный вызов с cursor идёт по декодированному пути (один запрос)', async () => {
      httpClient.setResponse('GET', '/v3/projects', createProjectListFixture(2), {
        link: NEXT_AND_SEEK_LINK,
      });
      const first = await operation.execute({});
      const cursor = first.pagination.nextCursor as string;
      expect(cursor).toBeDefined();

      const decoded = CursorCodec.decode(cursor, CURSOR_TAGS.projects);
      httpClient.setResponse('GET', decoded.path, createProjectListFixture(1));

      const second = await operation.execute({ cursor });

      expect(second.items).toHaveLength(1);
      const history = httpClient.getRequestHistory();
      expect(history).toHaveLength(2);
      expect(history[1]?.path).toBe(decoded.path);
    });

    it('битый курсор → InvalidCursorError', async () => {
      await expect(operation.execute({ cursor: 'broken' })).rejects.toThrow(InvalidCursorError);
    });
  });

  describe('регрессия: Link указывает на /v2/queues', () => {
    // Живая проба 2026-08-20: API на GET /v2/projects отдаёт Link со ссылками
    // на /v2/queues (путь после миграции 4.1 — /v3/projects, на v3 заголовок
    // не переснимался). Без починки заголовка листание уводило на чужую
    // коллекцию, и агент получал очереди под видом проектов.
    const QUEUES_LINK =
      '<https://api.tracker.yandex.net/v2/queues?expand=&page=2&perPage=3>; rel="next", ' +
      '<https://api.tracker.yandex.net/v2/queues?expand=&perPage=3{&page}>; rel="seek"';

    it('nextCursor ведёт на /v3/projects, а не на /v2/queues', async () => {
      httpClient.setResponse('GET', '/v3/projects?perPage=3', createProjectListFixture(3), {
        link: QUEUES_LINK,
        'x-total-count': '43',
      });

      const result = await operation.execute({ perPage: 3 });

      const decoded = CursorCodec.decode(
        result.pagination.nextCursor as string,
        CURSOR_TAGS.projects
      );
      // Из чужой ссылки берётся только `page`; query — наш собственный,
      // поэтому фантомного `expand=` от хендлера очередей в пути нет.
      expect(decoded.path).toBe('/v3/projects?perPage=3&page=2');
      expect(decoded.path).not.toContain('/v2/queues');
    });

    it('fetchAll обходит страницы проектов, а не очередей', async () => {
      httpClient.setResponseQueue('GET', '/v3/projects?perPage=3', [
        { data: createProjectListFixture(3), headers: { link: QUEUES_LINK } },
      ]);
      httpClient.setResponseQueue('GET', '/v3/projects?perPage=3&page=2', [
        { data: createProjectListFixture(2) },
      ]);

      const result = await operation.execute({ perPage: 3, fetchAll: true });

      expect(result.items).toHaveLength(5);
      const paths = httpClient.getRequestHistory().map((entry) => entry.path);
      expect(paths.every((path) => path.startsWith('/v3/projects'))).toBe(true);
    });
  });

  describe('execute (fetchAll)', () => {
    it('поднимает perPage к 100 и обходит несколько страниц', async () => {
      const page1 = createProjectListFixture(2);
      const page2 = createProjectListFixture(2);
      httpClient.setResponseQueue('GET', '/v3/projects?perPage=100', [
        { data: page1, headers: { link: NEXT_LINK } },
      ]);
      httpClient.setResponseQueue('GET', '/v3/projects?perPage=100&page=2', [{ data: page2 }]);

      const result = await operation.execute({ fetchAll: true });

      expect(result.items).toHaveLength(4);
      expect(result.pagination.pagesFetched).toBe(2);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('режет выдачу по maxItems и ставит truncated=true', async () => {
      httpClient.setResponse('GET', '/v3/projects?perPage=100', createProjectListFixture(3), {
        link: NEXT_LINK,
      });

      const result = await operation.execute({ fetchAll: true, maxItems: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure/http/client/mock-http-client.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetProjectsOperation } from '#tracker_api/api_operations/project/get-projects.operation.js';
import { createProjectListFixture } from '#helpers/project.fixture.js';

const NEXT_LINK = '<https://api.tracker.yandex.net/v2/projects?perPage=100&page=2>; rel="next"';

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
      httpClient.setResponse('GET', '/v2/projects', mockProjects);

      const result = await operation.execute({});

      expect(result.items).toEqual(mockProjects);
      const history = httpClient.getRequestHistory();
      expect(history[0]?.path).toBe('/v2/projects');
    });

    it('без Link rel=next: hasNextPage=false, fetchedAll=true', async () => {
      httpClient.setResponse('GET', '/v2/projects', createProjectListFixture(2));

      const result = await operation.execute({});

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.pagesFetched).toBe(1);
    });

    it('с Link rel=next: hasNextPage=true', async () => {
      httpClient.setResponse('GET', '/v2/projects', createProjectListFixture(2), {
        link: NEXT_LINK,
      });

      const result = await operation.execute({});

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
    });

    it('БАГ-ФИКС: total берётся из X-Total-Count, а не из длины страницы', async () => {
      // страница содержит 2 элемента, но реальный total = 137
      httpClient.setResponse('GET', '/v2/projects', createProjectListFixture(2), {
        'x-total-count': '137',
      });

      const result = await operation.execute({});

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(137);
    });

    it('без X-Total-Count total остаётся undefined (не подделывается)', async () => {
      httpClient.setResponse('GET', '/v2/projects', createProjectListFixture(2));

      const result = await operation.execute({});

      expect(result.pagination.total).toBeUndefined();
    });

    it('пробрасывает пагинацию в endpoint (page, perPage)', async () => {
      httpClient.setResponse('GET', '/v2/projects?page=2&perPage=100', createProjectListFixture(2));

      await operation.execute({ page: 2, perPage: 100 });

      expect(httpClient.getRequestHistory()[0]?.path).toBe('/v2/projects?page=2&perPage=100');
    });

    it('пробрасывает expand', async () => {
      httpClient.setResponse('GET', '/v2/projects?expand=queues', createProjectListFixture(1));

      await operation.execute({ expand: 'queues' });

      expect(httpClient.getRequestHistory()[0]?.path).toBe('/v2/projects?expand=queues');
    });

    it('пробрасывает queueId-фильтр', async () => {
      httpClient.setResponse('GET', '/v2/projects?queueId=QUEUE1', createProjectListFixture(1));

      await operation.execute({ queueId: 'QUEUE1' });

      expect(httpClient.getRequestHistory()[0]?.path).toBe('/v2/projects?queueId=QUEUE1');
    });
  });

  describe('execute (fetchAll)', () => {
    it('поднимает perPage к 100 и обходит несколько страниц', async () => {
      const page1 = createProjectListFixture(2);
      const page2 = createProjectListFixture(2);
      httpClient.setResponseQueue('GET', '/v2/projects?perPage=100', [
        { data: page1, headers: { link: NEXT_LINK } },
      ]);
      httpClient.setResponseQueue('GET', '/v2/projects?perPage=100&page=2', [{ data: page2 }]);

      const result = await operation.execute({ fetchAll: true });

      expect(result.items).toHaveLength(4);
      expect(result.pagination.pagesFetched).toBe(2);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('режет выдачу по maxItems и ставит truncated=true', async () => {
      httpClient.setResponse('GET', '/v2/projects?perPage=100', createProjectListFixture(3), {
        link: NEXT_LINK,
      });

      const result = await operation.execute({ fetchAll: true, maxItems: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
    });
  });
});

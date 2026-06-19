import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ServerConfig } from '#config';
import { GetChecklistOperation } from '#tracker_api/api_operations/checklist/get-checklist.operation.js';
import { InvalidCursorError } from '#tracker_api/utils/cursor-codec.util.js';

const NEXT_LINK =
  '<https://api.tracker.yandex.net/v2/issues/TEST-1/checklistItems?id=ID2>; rel="next"';

const item = (id: string): ChecklistItemWithUnknownFields => ({
  id,
  text: `Item ${id}`,
  checked: false,
});

describe('GetChecklistOperation', () => {
  let operation: GetChecklistOperation;
  let httpClient: MockHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;

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

    mockConfig = { maxBatchSize: 100, maxConcurrentRequests: 5 } as ServerConfig;

    operation = new GetChecklistOperation(httpClient, mockCacheManager, mockLogger, mockConfig);
  });

  describe('execute (single page)', () => {
    it('запрашивает корректный endpoint и возвращает PaginatedResult без next', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems', [item('1'), item('2')]);

      const result = await operation.execute({ issueId: 'TEST-1' });

      const history = httpClient.getRequestHistory();
      expect(history[0]).toMatchObject({ method: 'GET', path: '/v2/issues/TEST-1/checklistItems' });
      expect(result.items).toHaveLength(2);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('выставляет hasNextPage=true при наличии Link rel="next"', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems', [item('1')], {
        link: NEXT_LINK,
      });

      const result = await operation.execute({ issueId: 'TEST-1' });

      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('пробрасывает perPage в query (без page)', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems', []);

      await operation.execute({ issueId: 'TEST-1', perPage: 20 });

      expect(httpClient.getRequestHistory()[0]?.params).toEqual({ perPage: 20 });
    });

    it('выдаёт nextCursor при наличии Link rel="next"', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems', [item('1')], {
        link: NEXT_LINK,
      });

      const result = await operation.execute({ issueId: 'TEST-1' });

      expect(result.pagination.nextCursor).toBeDefined();
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('пробрасывает ошибки API', async () => {
      await expect(operation.execute({ issueId: 'TEST-1' })).rejects.toThrow();
    });
  });

  describe('execute (fetchAll)', () => {
    it('обходит несколько страниц через Link rel="next"', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems', [item('1')], {
        link: NEXT_LINK,
      });
      // Вторая страница — под путём с query (как его вернёт stripHost)
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems?id=ID2', [item('2')]);

      const result = await operation.execute({ issueId: 'TEST-1', fetchAll: true });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.pagesFetched).toBe(2);
    });

    it('обрезает выдачу по maxItems и выставляет truncated', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems', [item('1'), item('2')], {
        link: NEXT_LINK,
      });

      const result = await operation.execute({ issueId: 'TEST-1', fetchAll: true, maxItems: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.truncated).toBe(true);
    });
  });

  describe('execute (cursor)', () => {
    it('курсорная регрессия: nextCursor → повторный вызов отдаёт следующие записи', async () => {
      // Первая страница отдаёт Link rel="next" с ?id=ID2 → nextCursor
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems', [item('1')], {
        link: NEXT_LINK,
      });
      // Декодированный путь курсора (stripHost от next) отдаёт следующую запись
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems?id=ID2', [item('2')]);

      const firstPage = await operation.execute({ issueId: 'TEST-1' });
      const cursor = firstPage.pagination.nextCursor;
      expect(cursor).toBeDefined();

      const secondPage = await operation.execute({ issueId: 'TEST-1', cursor: cursor as string });

      // Повторный запрос ушёл по декодированному из курсора пути
      const lastReq = httpClient.getRequestHistory().at(-1);
      expect(lastReq?.path).toBe('/v2/issues/TEST-1/checklistItems?id=ID2');
      expect(secondPage.items).toHaveLength(1);
      expect(secondPage.items[0]?.id).toBe('2');
    });

    it('битый курсор → InvalidCursorError', async () => {
      await expect(
        operation.execute({ issueId: 'TEST-1', cursor: 'not-a-valid-cursor' })
      ).rejects.toBeInstanceOf(InvalidCursorError);
    });
  });

  describe('executeMany', () => {
    it('возвращает PaginatedResult для каждой задачи', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems', [item('1')]);
      httpClient.setResponse('GET', '/v2/issues/TEST-2/checklistItems', [item('2'), item('3')]);

      const result = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      if (result[0].status === 'fulfilled') {
        expect(result[0].value.items).toHaveLength(1);
        expect(result[0].value.pagination.fetchedAll).toBe(true);
      }
    });

    it('обрабатывает частичные ошибки', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/checklistItems', [item('1')]);
      // для TEST-2 ответ не настроен → reject

      const result = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[1].status).toBe('rejected');
    });

    it('возвращает пустой результат для пустого массива', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(httpClient.getRequestHistory()).toHaveLength(0);
    });
  });
});

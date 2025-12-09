import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure/types.js';
import type { ServerConfig } from '#config';
import type { ParallelExecutor } from '@fractalizer/mcp-infrastructure/async/parallel-executor.js';
import { GetIssueLinksOperation } from '#tracker_api/api_operations/link/get-issue-links.operation.js';
import {
  createLinkListFixture,
  createSubtaskLinkFixture,
  createRelatesLinkFixture,
  createDependsLinkFixture,
} from '#helpers/link.fixture.js';

describe('GetIssueLinksOperation', () => {
  let operation: GetIssueLinksOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;
  let mockParallelExecutor: ParallelExecutor;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn().mockResolvedValue(null),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as IHttpClient;

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

    mockConfig = {
      maxBatchSize: 50,
      maxConcurrentRequests: 10,
      token: 'test-token',
      orgId: 'test-org',
    } as ServerConfig;

    operation = new GetIssueLinksOperation(
      mockHttpClient,
      mockCacheManager,
      mockLogger,
      mockConfig
    );

    // Мокируем parallelExecutor через приватное поле
    mockParallelExecutor = {
      executeParallel: vi.fn(),
    } as unknown as ParallelExecutor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Замена приватного поля для unit тестирования
    (operation as any).parallelExecutor = mockParallelExecutor;
  });

  describe('execute', () => {
    it('возвращает пустой массив для пустого массива ключей', async () => {
      const result = await operation.execute([]);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('GetIssueLinksOperation: пустой массив ключей');
      expect(mockParallelExecutor.executeParallel).not.toHaveBeenCalled();
    });

    it('успешно получает связи для нескольких задач', async () => {
      const issueIds = ['TEST-1', 'TEST-2', 'TEST-3'];
      const mockLinksSet1 = createLinkListFixture(2);
      const mockLinksSet2 = createLinkListFixture(3);
      const mockLinksSet3: LinkWithUnknownFields[] = [];

      const mockBatchResults: BatchResult<string, LinkWithUnknownFields[]> = [
        { status: 'fulfilled', value: mockLinksSet1, key: 'TEST-1', index: 0 },
        { status: 'fulfilled', value: mockLinksSet2, key: 'TEST-2', index: 1 },
        { status: 'fulfilled', value: mockLinksSet3, key: 'TEST-3', index: 2 },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      const result = await operation.execute(issueIds);

      expect(result).toEqual(mockBatchResults);
      expect(mockParallelExecutor.executeParallel).toHaveBeenCalledWith(
        expect.any(Array),
        'get issue links'
      );
      expect(mockParallelExecutor.executeParallel).toHaveBeenCalledTimes(1);

      // Проверяем, что operations массив содержит правильные функции
      const callArgs = vi.mocked(mockParallelExecutor.executeParallel).mock.calls[0];
      if (callArgs) {
        const operations = callArgs[0] as Array<{
          key: string;
          fn: () => Promise<LinkWithUnknownFields[]>;
        }>;
        expect(operations).toHaveLength(3);
        expect(operations[0]?.key).toBe('TEST-1');
        expect(operations[1]?.key).toBe('TEST-2');
        expect(operations[2]?.key).toBe('TEST-3');
      }
    });

    it('обрабатывает частичные ошибки', async () => {
      const issueIds = ['TEST-1', 'TEST-2', 'TEST-3'];
      const mockLinks = createLinkListFixture(2);
      const mockError = new Error('Issue not found');

      const mockBatchResults: BatchResult<string, LinkWithUnknownFields[]> = [
        { status: 'fulfilled', value: mockLinks, key: 'TEST-1', index: 0 },
        { status: 'rejected', reason: mockError, key: 'TEST-2', index: 1 },
        { status: 'fulfilled', value: [], key: 'TEST-3', index: 2 },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      const result = await operation.execute(issueIds);

      expect(result).toEqual(mockBatchResults);
      expect(result[0]?.status).toBe('fulfilled');
      expect(result[1]?.status).toBe('rejected');
      expect(result[2]?.status).toBe('fulfilled');
    });

    it('возвращает связи разных типов', async () => {
      const issueIds = ['TEST-789'];
      const mockLinks: LinkWithUnknownFields[] = [
        createSubtaskLinkFixture({ id: 'link1' }),
        createRelatesLinkFixture({ id: 'link2' }),
        createDependsLinkFixture({ id: 'link3' }),
      ];

      const mockBatchResults: BatchResult<string, LinkWithUnknownFields[]> = [
        { status: 'fulfilled', value: mockLinks, key: 'TEST-789', index: 0 },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      const result = await operation.execute(issueIds);

      expect(result[0]?.status).toBe('fulfilled');
      if (result[0]?.status === 'fulfilled') {
        expect(result[0].value).toHaveLength(3);
        expect(result[0].value[0]!.type.id).toBe('subtask');
        expect(result[0].value[1]!.type.id).toBe('relates');
        expect(result[0].value[2]!.type.id).toBe('depends');
      }
    });

    it('логирует начало операции', async () => {
      const issueIds = ['TEST-1', 'TEST-2'];
      const mockBatchResults: BatchResult<string, LinkWithUnknownFields[]> = [
        { status: 'fulfilled', value: [], key: 'TEST-1', index: 0 },
        { status: 'fulfilled', value: [], key: 'TEST-2', index: 1 },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      await operation.execute(issueIds);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение связей для 2 задач параллельно: TEST-1, TEST-2'
      );
    });
  });
});

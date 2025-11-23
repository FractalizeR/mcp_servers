import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { ParallelExecutor } from '@mcp-framework/infrastructure/async/parallel-executor.js';
import type { ServerConfig } from '#config';
import type { ChangelogEntryWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure/types.js';
import { GetIssueChangelogOperation } from '#tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';

describe('GetIssueChangelogOperation', () => {
  let operation: GetIssueChangelogOperation;
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

    operation = new GetIssueChangelogOperation(
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'GetIssueChangelogOperation: пустой массив ключей'
      );
      expect(mockParallelExecutor.executeParallel).not.toHaveBeenCalled();
    });

    it('успешно получает историю изменений нескольких задач', async () => {
      const issueKeys = ['TEST-123', 'PROJ-456'];
      const mockChangelog1: ChangelogEntryWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-123/changelog/1',
          issue: { id: '123', key: 'TEST-123', display: 'Test Issue' },
          updatedAt: '2024-01-01T10:00:00.000Z',
          updatedBy: {
            uid: 'user1',
            display: 'User 1',
            login: 'user1',
            isActive: true,
          },
          type: 'IssueUpdated',
          fields: [
            {
              field: {
                id: 'status',
                display: 'Status',
              },
              from: { id: '1', key: 'open', display: 'Open' },
              to: { id: '2', key: 'inProgress', display: 'In Progress' },
            },
          ],
        },
      ];

      const mockChangelog2: ChangelogEntryWithUnknownFields[] = [
        {
          id: '2',
          self: 'https://api.tracker.yandex.net/v3/issues/PROJ-456/changelog/2',
          issue: { id: '456', key: 'PROJ-456', display: 'Test Issue' },
          updatedAt: '2024-01-02T10:00:00.000Z',
          updatedBy: {
            uid: 'user2',
            display: 'User 2',
            login: 'user2',
            isActive: true,
          },
          type: 'IssueUpdated',
          fields: [],
        },
      ];

      const mockBatchResults: BatchResult<string, ChangelogEntryWithUnknownFields[]> = [
        { status: 'fulfilled', value: mockChangelog1, key: 'TEST-123', index: 0 },
        { status: 'fulfilled', value: mockChangelog2, key: 'PROJ-456', index: 1 },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      const result = await operation.execute(issueKeys);

      expect(result).toEqual(mockBatchResults);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Получение истории изменений для ${issueKeys.length} задач: ${issueKeys.join(', ')}`
      );
    });

    it('обрабатывает частичные ошибки (некоторые задачи не найдены)', async () => {
      const issueKeys = ['TEST-123', 'INVALID-999'];
      const mockChangelog: ChangelogEntryWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-123/changelog/1',
          issue: { id: '123', key: 'TEST-123', display: 'Test Issue' },
          updatedAt: '2024-01-01T10:00:00.000Z',
          updatedBy: {
            uid: 'user1',
            display: 'User 1',
            login: 'user1',
            isActive: true,
          },
          type: 'IssueUpdated',
          fields: [],
        },
      ];

      const mockBatchResults: BatchResult<string, ChangelogEntryWithUnknownFields[]> = [
        { status: 'fulfilled', value: mockChangelog, key: 'TEST-123', index: 0 },
        {
          status: 'rejected',
          reason: new Error('HTTP 404: Issue not found'),
          key: 'INVALID-999',
          index: 1,
        },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      const result = await operation.execute(issueKeys);

      expect(result).toEqual(mockBatchResults);
      expect(result.length).toBe(2);
      expect(result[0]?.status).toBe('fulfilled');
      expect(result[1]?.status).toBe('rejected');
    });

    it('вызывает ParallelExecutor с правильными параметрами', async () => {
      const issueKeys = ['TEST-1', 'TEST-2'];
      const mockBatchResults: BatchResult<string, ChangelogEntryWithUnknownFields[]> = [
        {
          status: 'fulfilled',
          value: [],
          key: 'TEST-1',
          index: 0,
        },
        {
          status: 'fulfilled',
          value: [],
          key: 'TEST-2',
          index: 1,
        },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      await operation.execute(issueKeys);

      expect(mockParallelExecutor.executeParallel).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ key: 'TEST-1', fn: expect.any(Function) }),
          expect.objectContaining({ key: 'TEST-2', fn: expect.any(Function) }),
        ]),
        'get issue changelog'
      );
    });

    it('использует httpClient.get для каждой задачи', async () => {
      const issueKeys = ['TEST-123'];
      const mockChangelog: ChangelogEntryWithUnknownFields[] = [];

      // Мокируем executeParallel для фактического вызова функции
      vi.mocked(mockParallelExecutor.executeParallel).mockImplementation(async (operations) => {
        const results = await Promise.allSettled(operations.map((op) => op.fn()));
        return results.map((result, index) => {
          const op = operations[index];
          if (!op) throw new Error('Missing operation');
          if (result.status === 'fulfilled') {
            return {
              status: 'fulfilled',
              value: result.value,
              key: op.key,
              index,
            };
          } else {
            return {
              status: 'rejected',
              reason:
                result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
              key: op.key,
              index,
            };
          }
        });
      });

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockChangelog);

      await operation.execute(issueKeys);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/TEST-123/changelog');
    });

    it('логирует количество записей для каждой задачи', async () => {
      const issueKeys = ['TEST-123'];
      const mockChangelog: ChangelogEntryWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-123/changelog/1',
          issue: { id: '123', key: 'TEST-123', display: 'Test Issue' },
          updatedAt: '2024-01-01T10:00:00.000Z',
          updatedBy: {
            uid: 'user1',
            display: 'User 1',
            login: 'user1',
            isActive: true,
          },
          type: 'IssueUpdated',
          fields: [],
        },
      ];

      // Мокируем executeParallel для фактического вызова функции
      vi.mocked(mockParallelExecutor.executeParallel).mockImplementation(async (operations) => {
        const results = await Promise.allSettled(operations.map((op) => op.fn()));
        return results.map((result, index) => {
          const op = operations[index];
          if (!op) throw new Error('Missing operation');
          if (result.status === 'fulfilled') {
            return {
              status: 'fulfilled',
              value: result.value,
              key: op.key,
              index,
            };
          } else {
            return {
              status: 'rejected',
              reason:
                result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
              key: op.key,
              index,
            };
          }
        });
      });

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockChangelog);

      await operation.execute(issueKeys);

      expect(mockLogger.debug).toHaveBeenCalledWith('История изменений для TEST-123: 1 записей');
    });
  });
});

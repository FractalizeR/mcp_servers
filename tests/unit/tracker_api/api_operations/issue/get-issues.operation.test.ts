import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@infrastructure/logging/index.js';
import type { CacheManager } from '@infrastructure/cache/cache-manager.interface.js';
import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { RetryHandler } from '@infrastructure/http/retry/retry-handler.js';
import { ParallelExecutor } from '@infrastructure/async/parallel-executor.js';
import type { ServerConfig } from '@types';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import type { BatchResult } from '@types';
import { GetIssuesOperation } from '@tracker_api/api_operations/issue/get-issues.operation.js';

describe('GetIssuesOperation', () => {
  let operation: GetIssuesOperation;
  let mockHttpClient: HttpClient;
  let mockRetryHandler: RetryHandler;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;
  let mockParallelExecutor: ParallelExecutor;

  beforeEach(() => {
    mockHttpClient = {} as HttpClient;
    mockRetryHandler = {} as RetryHandler;
    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
    } as unknown as CacheManager;
    mockLogger = {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;
    mockConfig = {
      maxBatchSize: 50,
      maxConcurrentRequests: 10,
      token: 'test-token',
      orgId: 'test-org',
    } as ServerConfig;

    operation = new GetIssuesOperation(
      mockHttpClient,
      mockRetryHandler,
      mockCacheManager,
      mockLogger,
      mockConfig
    );

    // Мокируем parallelExecutor через приватное поле
    mockParallelExecutor = {
      executeParallel: vi.fn(),
    } as unknown as ParallelExecutor;
    (operation as any).parallelExecutor = mockParallelExecutor;
  });

  describe('execute', () => {
    it('возвращает пустой массив для пустого массива ключей', async () => {
      const result = await operation.execute([]);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('GetIssuesOperation: пустой массив ключей');
      expect(mockParallelExecutor.executeParallel).not.toHaveBeenCalled();
    });

    it('успешно получает несколько задач', async () => {
      const issueKeys = ['TASK-1', 'TASK-2', 'TASK-3'];
      const mockIssues: IssueWithUnknownFields[] = [
        {
          id: '1',
          key: 'TASK-1',
          summary: 'Issue 1',
          queue: { id: '1', key: 'Q', display: 'Queue', name: 'Queue' },
          status: { id: '1', key: 'open', display: 'Open' },
          createdBy: { uid: 'user1', display: 'User', login: 'user1', isActive: true },
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        } as IssueWithUnknownFields,
        {
          id: '2',
          key: 'TASK-2',
          summary: 'Issue 2',
          queue: { id: '1', key: 'Q', display: 'Queue', name: 'Queue' },
          status: { id: '1', key: 'open', display: 'Open' },
          createdBy: { uid: 'user1', display: 'User', login: 'user1', isActive: true },
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        } as IssueWithUnknownFields,
        {
          id: '3',
          key: 'TASK-3',
          summary: 'Issue 3',
          queue: { id: '1', key: 'Q', display: 'Queue', name: 'Queue' },
          status: { id: '1', key: 'open', display: 'Open' },
          createdBy: { uid: 'user1', display: 'User', login: 'user1', isActive: true },
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        } as IssueWithUnknownFields,
      ];

      const mockBatchResults: BatchResult<string, IssueWithUnknownFields> = [
        { status: 'fulfilled', value: mockIssues[0]!, key: 'TASK-1', index: 0 },
        { status: 'fulfilled', value: mockIssues[1]!, key: 'TASK-2', index: 1 },
        { status: 'fulfilled', value: mockIssues[2]!, key: 'TASK-3', index: 2 },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      const result = await operation.execute(issueKeys);

      expect(result).toEqual(mockBatchResults);
      expect(mockParallelExecutor.executeParallel).toHaveBeenCalledWith(
        expect.any(Array),
        'get issues'
      );
      expect(mockParallelExecutor.executeParallel).toHaveBeenCalledTimes(1);

      // Проверяем, что operations массив содержит правильные функции
      const callArgs = vi.mocked(mockParallelExecutor.executeParallel).mock.calls[0];
      if (callArgs) {
        const operations = callArgs[0] as Array<{
          key: string;
          fn: () => Promise<IssueWithUnknownFields>;
        }>;
        expect(operations).toHaveLength(3);
        expect(operations[0]?.key).toBe('TASK-1');
        expect(operations[1]?.key).toBe('TASK-2');
        expect(operations[2]?.key).toBe('TASK-3');
      }
    });

    it('обрабатывает частичные ошибки', async () => {
      const issueKeys = ['TASK-1', 'TASK-2', 'TASK-3'];
      const mockIssue: IssueWithUnknownFields = {
        id: '1',
        key: 'TASK-1',
        summary: 'Issue 1',
        queue: { id: '1', key: 'Q', display: 'Queue', name: 'Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User', login: 'user1', isActive: true },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      } as IssueWithUnknownFields;
      const mockError = new Error('Network error');

      const mockBatchResults: BatchResult<string, IssueWithUnknownFields> = [
        { status: 'fulfilled', value: mockIssue, key: 'TASK-1', index: 0 },
        { status: 'rejected', reason: mockError, key: 'TASK-2', index: 1 },
        { status: 'rejected', reason: mockError, key: 'TASK-3', index: 2 },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      const result = await operation.execute(issueKeys);

      expect(result).toEqual(mockBatchResults);
      expect(result[0]?.status).toBe('fulfilled');
      expect(result[1]?.status).toBe('rejected');
      expect(result[2]?.status).toBe('rejected');

      if (result[0] && result[0].status === 'fulfilled') {
        expect(result[0].value.key).toBe('TASK-1');
      }
      if (result[1] && result[1].status === 'rejected') {
        expect(result[1].reason).toEqual(mockError);
      }
    });

    it('обрабатывает все отклоненные результаты', async () => {
      const issueKeys = ['TASK-1', 'TASK-2'];
      const mockError1 = new Error('Error 1');
      const mockError2 = new Error('Error 2');

      const mockBatchResults: BatchResult<string, IssueWithUnknownFields> = [
        { status: 'rejected', reason: mockError1, key: 'TASK-1', index: 0 },
        { status: 'rejected', reason: mockError2, key: 'TASK-2', index: 1 },
      ];

      vi.mocked(mockParallelExecutor.executeParallel).mockResolvedValue(mockBatchResults);

      const result = await operation.execute(issueKeys);

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.status === 'rejected')).toBe(true);
      const rejected0 = result[0];
      const rejected1 = result[1];
      if (rejected0 && rejected0.status === 'rejected') {
        expect(rejected0.reason).toEqual(mockError1);
      }
      if (rejected1 && rejected1.status === 'rejected') {
        expect(rejected1.reason).toEqual(mockError2);
      }
    });
  });
});

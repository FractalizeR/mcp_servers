import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import { ParallelExecutor } from '@mcp-framework/infrastructure/async/parallel-executor.js';
import type { ServerConfig } from '#config';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure/types.js';
import { GetIssuesOperation } from '#tracker_api/api_operations/issue/get-issues.operation.js';

describe('GetIssuesOperation', () => {
  let operation: GetIssuesOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;
  let mockParallelExecutor: ParallelExecutor;

  beforeEach(() => {
    mockHttpClient = {} as HttpClient;
    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
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

    operation = new GetIssuesOperation(mockHttpClient, mockCacheManager, mockLogger, mockConfig);

    // Мокируем parallelExecutor через приватное поле
    mockParallelExecutor = {
      executeParallel: vi.fn(),
    } as unknown as ParallelExecutor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Замена приватного поля для unit тестирования (альтернатива - DI, но потребует изменения production кода)
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

    it('выполняет реальный код кеширования для одной задачи (покрывает строки 76-81)', async () => {
      const issueKey = 'TASK-1';
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

      // НЕ мокируем parallelExecutor - используем реальный
      const realParallelExecutor = new ParallelExecutor(mockLogger, {
        maxBatchSize: 50,
        maxConcurrentRequests: 10,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Замена приватного поля для unit тестирования
      (operation as any).parallelExecutor = realParallelExecutor;

      // Мокируем httpClient.get чтобы он возвращал данные
      mockHttpClient.get = vi.fn().mockResolvedValue(mockIssue);

      // Мокируем cache (cache miss) - СИНХРОННО
      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);
      vi.mocked(mockCacheManager.set).mockReturnValue(undefined);

      const result = await operation.execute([issueKey]);

      // Проверяем результат
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('fulfilled');
      if (result[0] && result[0].status === 'fulfilled') {
        expect(result[0].value.key).toBe('TASK-1');
      }

      // Проверяем, что был вызван httpClient.get
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/TASK-1');

      // Проверяем, что кеш был проверен
      expect(mockCacheManager.get).toHaveBeenCalled();
    });

    it('использует кешированные данные если доступны', async () => {
      const issueKey = 'TASK-CACHED';
      const cachedIssue: IssueWithUnknownFields = {
        id: '99',
        key: 'TASK-CACHED',
        summary: 'Cached Issue',
        queue: { id: '1', key: 'Q', display: 'Queue', name: 'Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User', login: 'user1', isActive: true },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      } as IssueWithUnknownFields;

      // Используем реальный parallelExecutor
      const realParallelExecutor = new ParallelExecutor(mockLogger, {
        maxBatchSize: 50,
        maxConcurrentRequests: 10,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Замена приватного поля для unit тестирования
      (operation as any).parallelExecutor = realParallelExecutor;

      // Мокируем cache (cache hit) - СИНХРОННО
      vi.mocked(mockCacheManager.get).mockResolvedValue(cachedIssue);

      // httpClient.get НЕ должен быть вызван
      mockHttpClient.get = vi.fn();

      const result = await operation.execute([issueKey]);

      // Проверяем результат
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('fulfilled');
      if (result[0] && result[0].status === 'fulfilled') {
        expect(result[0].value.key).toBe('TASK-CACHED');
        expect(result[0].value.summary).toBe('Cached Issue');
      }

      // Проверяем, что httpClient.get НЕ был вызван (данные из кеша)
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('выполняет batch запросов с реальным parallelExecutor', async () => {
      const issueKeys = ['TASK-A', 'TASK-B', 'TASK-C'];
      const mockIssues: IssueWithUnknownFields[] = issueKeys.map((key, idx) => ({
        id: String(idx + 1),
        key,
        summary: `Issue ${key}`,
        queue: { id: '1', key: 'Q', display: 'Queue', name: 'Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User', login: 'user1', isActive: true },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      })) as IssueWithUnknownFields[];

      // Используем реальный parallelExecutor
      const realParallelExecutor = new ParallelExecutor(mockLogger, {
        maxBatchSize: 50,
        maxConcurrentRequests: 10,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Замена приватного поля для unit тестирования
      (operation as any).parallelExecutor = realParallelExecutor;

      // Мокируем httpClient.get с разными ответами для каждого ключа
      mockHttpClient.get = vi.fn().mockImplementation((url: string) => {
        const key = url.split('/').pop();
        const issue = mockIssues.find((i) => i.key === key);
        return Promise.resolve(issue);
      });

      // Мокируем cache (все cache miss) - СИНХРОННО
      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);
      vi.mocked(mockCacheManager.set).mockReturnValue(undefined);

      const result = await operation.execute(issueKeys);

      // Проверяем результат
      expect(result).toHaveLength(3);
      expect(result.every((r) => r.status === 'fulfilled')).toBe(true);

      // Проверяем, что httpClient.get был вызван для каждого ключа
      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/TASK-A');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/TASK-B');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/TASK-C');
    });
  });
});

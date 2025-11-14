/**
 * Unit тесты для GetIssuesOperation (batch-получение задач)
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import type { Mock } from 'vitest';
import { GetIssuesOperation } from '@domain/operations/issue/get-issues.operation.js';
import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { RetryHandler } from '@infrastructure/http/retry/retry-handler.js';
import type { CacheManager } from '@infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@infrastructure/logger.js';
import type { Issue } from '@domain/entities/issue.entity.js';

describe('GetIssuesOperation', () => {
  let operation: GetIssuesOperation;
  let httpClient: Mock<HttpClient>;
  let retryHandler: Mock<RetryHandler>;
  let cacheManager: Mock<CacheManager>;
  let logger: Mock<Logger>;

  beforeEach(() => {
    // Моки зависимостей
    httpClient = {
      get: vi.fn<typeof httpClient.get>(),
    } as unknown as Mock<HttpClient>;

    retryHandler = {
      executeWithRetry: vi.fn(<T>(fn: () => Promise<T>) => fn()),
    } as unknown as Mock<RetryHandler>;

    cacheManager = {
      get: vi.fn<typeof cacheManager.get>(),
      set: vi.fn<typeof cacheManager.set>(),
    } as unknown as Mock<CacheManager>;

    logger = {
      info: vi.fn<typeof logger.info>(),
      warn: vi.fn<typeof logger.warn>(),
      error: vi.fn<typeof logger.error>(),
      debug: vi.fn<typeof logger.debug>(),
    } as unknown as Mock<Logger>;

    operation = new GetIssuesOperation(httpClient, retryHandler, cacheManager, logger);
  });

  it('должен вернуть пустой массив для пустого входного массива', async () => {
    const result = await operation.execute([]);

    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('GetIssuesOperation: пустой массив ключей');
  });

  it('должен успешно получить несколько задач параллельно', async () => {
    const issueKeys = ['QUEUE-123', 'QUEUE-456'];
    const mockIssues: Issue[] = [
      {
        id: '1',
        key: 'QUEUE-123',
        summary: 'Task 1',
        queue: { id: '1', key: 'QUEUE', name: 'Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        key: 'QUEUE-456',
        summary: 'Task 2',
        queue: { id: '1', key: 'QUEUE', name: 'Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    httpClient.get.mockResolvedValueOnce(mockIssues[0]);
    httpClient.get.mockResolvedValueOnce(mockIssues[1]);
    cacheManager.get.mockReturnValue(undefined); // Cache miss

    const results = await operation.execute(issueKeys);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      status: 'fulfilled',
      issueKey: 'QUEUE-123',
      value: mockIssues[0],
    });
    expect(results[1]).toEqual({
      status: 'fulfilled',
      issueKey: 'QUEUE-456',
      value: mockIssues[1],
    });

    expect(httpClient.get).toHaveBeenCalledTimes(2);
    expect(httpClient.get).toHaveBeenCalledWith('/v3/issues/QUEUE-123');
    expect(httpClient.get).toHaveBeenCalledWith('/v3/issues/QUEUE-456');
  });

  it('должен обработать частичные ошибки (Promise.allSettled)', async () => {
    const issueKeys = ['QUEUE-123', 'QUEUE-456', 'QUEUE-789'];
    const mockIssue: Issue = {
      id: '1',
      key: 'QUEUE-123',
      summary: 'Task 1',
      queue: { id: '1', key: 'QUEUE', name: 'Queue' },
      status: { id: '1', key: 'open', display: 'Open' },
      createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    const mockError = new Error('Not found');

    httpClient.get.mockResolvedValueOnce(mockIssue); // QUEUE-123: success
    httpClient.get.mockRejectedValueOnce(mockError); // QUEUE-456: error
    httpClient.get.mockResolvedValueOnce({
      id: '3',
      key: 'QUEUE-789',
      summary: 'Task 3',
      queue: { id: '1', key: 'QUEUE', name: 'Queue' },
      status: { id: '1', key: 'open', display: 'Open' },
      createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }); // QUEUE-789: success
    cacheManager.get.mockReturnValue(undefined); // Cache miss

    const results = await operation.execute(issueKeys);

    expect(results).toHaveLength(3);

    // QUEUE-123: fulfilled
    expect(results[0]).toEqual({
      status: 'fulfilled',
      issueKey: 'QUEUE-123',
      value: mockIssue,
    });

    // QUEUE-456: rejected
    expect(results[1]).toEqual({
      status: 'rejected',
      issueKey: 'QUEUE-456',
      reason: mockError,
    });

    // QUEUE-789: fulfilled
    expect(results[2]).toEqual({
      status: 'fulfilled',
      issueKey: 'QUEUE-789',
      value: {
        id: '3',
        key: 'QUEUE-789',
        summary: 'Task 3',
        queue: { id: '1', key: 'QUEUE', name: 'Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    expect(logger.error).toHaveBeenCalledWith('Ошибка получения задачи QUEUE-456:', mockError);
  });

  it('должен использовать кеш если доступно', async () => {
    const issueKeys = ['QUEUE-123'];
    const cachedIssue: Issue = {
      id: '1',
      key: 'QUEUE-123',
      summary: 'Cached Task',
      queue: { id: '1', key: 'QUEUE', name: 'Queue' },
      status: { id: '1', key: 'open', display: 'Open' },
      createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    cacheManager.get.mockReturnValueOnce(cachedIssue); // Cache hit

    const results = await operation.execute(issueKeys);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      status: 'fulfilled',
      issueKey: 'QUEUE-123',
      value: cachedIssue,
    });

    expect(httpClient.get).not.toHaveBeenCalled(); // Не должен делать HTTP запрос
  });

  it('должен сохранить результаты в кеш после успешного получения', async () => {
    const issueKeys = ['QUEUE-123'];
    const mockIssue: Issue = {
      id: '1',
      key: 'QUEUE-123',
      summary: 'Task 1',
      queue: { id: '1', key: 'QUEUE', name: 'Queue' },
      status: { id: '1', key: 'open', display: 'Open' },
      createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    httpClient.get.mockResolvedValueOnce(mockIssue);
    cacheManager.get.mockReturnValue(undefined); // Cache miss

    await operation.execute(issueKeys);

    expect(cacheManager.set).toHaveBeenCalledWith('issue:QUEUE-123', mockIssue);
  });

  it('должен логировать количество запросов', async () => {
    const issueKeys = ['QUEUE-1', 'QUEUE-2', 'QUEUE-3'];

    httpClient.get.mockResolvedValue({
      id: '1',
      key: 'QUEUE-1',
      summary: 'Task',
      queue: { id: '1', key: 'QUEUE', name: 'Queue' },
      status: { id: '1', key: 'open', display: 'Open' },
      createdBy: { uid: 'user1', display: 'User 1', login: 'user1', isActive: true },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    cacheManager.get.mockReturnValue(undefined);

    await operation.execute(issueKeys);

    expect(logger.info).toHaveBeenCalledWith(
      'Получение 3 задач параллельно: QUEUE-1, QUEUE-2, QUEUE-3'
    );
  });
});

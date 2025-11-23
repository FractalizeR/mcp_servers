import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ServerConfig } from '#config';
import { GetWorklogsOperation } from '#tracker_api/api_operations/worklog/get-worklogs.operation.js';

describe('GetWorklogsOperation', () => {
  let operation: GetWorklogsOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;

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
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    } as ServerConfig;

    operation = new GetWorklogsOperation(mockHttpClient, mockCacheManager, mockLogger, mockConfig);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockWorklogs: WorklogWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
          issue: {
            id: 'abc123',
            key: 'TEST-1',
            display: 'Test issue',
          },
          comment: 'Работал над реализацией',
          createdBy: {
            self: 'https://api.tracker.yandex.net/v2/users/1',
            id: '1',
            display: 'User 1',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
          start: '2025-01-18T09:00:00.000+0000',
          duration: 'PT1H30M',
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorklogs);

      const result = await operation.execute('TEST-1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/issues/TEST-1/worklog');
      expect(result).toEqual(mockWorklogs);
    });

    it('should return array of worklogs', async () => {
      const mockWorklogs: WorklogWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v2/issues/PROJ-10/worklog/1',
          issue: {
            id: 'xyz456',
            key: 'PROJ-10',
            display: 'Project task',
          },
          createdBy: {
            self: 'https://api.tracker.yandex.net/v2/users/2',
            id: '2',
            display: 'User 2',
          },
          createdAt: '2025-01-18T11:00:00.000+0000',
          start: '2025-01-18T10:00:00.000+0000',
          duration: 'PT2H',
        },
        {
          id: '2',
          self: 'https://api.tracker.yandex.net/v2/issues/PROJ-10/worklog/2',
          issue: {
            id: 'xyz456',
            key: 'PROJ-10',
            display: 'Project task',
          },
          comment: 'Тестирование',
          createdBy: {
            self: 'https://api.tracker.yandex.net/v2/users/2',
            id: '2',
            display: 'User 2',
          },
          createdAt: '2025-01-18T13:00:00.000+0000',
          start: '2025-01-18T13:00:00.000+0000',
          duration: 'PT45M',
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorklogs);

      const result = await operation.execute('PROJ-10');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should convert non-array response to array', async () => {
      const mockWorklog: WorklogWithUnknownFields = {
        id: '1',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
        issue: {
          id: 'abc123',
          key: 'TEST-1',
          display: 'Test issue',
        },
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/1',
          id: '1',
          display: 'User 1',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H',
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorklog as never);

      const result = await operation.execute('TEST-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockWorklog);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(operation.execute('TEST-1')).rejects.toThrow('API Error');
    });

    it('should log info messages', async () => {
      const mockWorklogs: WorklogWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
          issue: {
            id: 'abc123',
            key: 'TEST-1',
            display: 'Test issue',
          },
          createdBy: {
            self: 'https://api.tracker.yandex.net/v2/users/1',
            id: '1',
            display: 'User 1',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
          start: '2025-01-18T10:00:00.000+0000',
          duration: 'PT1H',
        },
        {
          id: '2',
          self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/2',
          issue: {
            id: 'abc123',
            key: 'TEST-1',
            display: 'Test issue',
          },
          createdBy: {
            self: 'https://api.tracker.yandex.net/v2/users/2',
            id: '2',
            display: 'User 2',
          },
          createdAt: '2025-01-18T11:00:00.000+0000',
          start: '2025-01-18T11:00:00.000+0000',
          duration: 'PT30M',
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorklogs);

      await operation.execute('TEST-1');

      expect(mockLogger.info).toHaveBeenCalledWith('Получение записей времени задачи TEST-1');
      expect(mockLogger.info).toHaveBeenCalledWith('Получено 2 записей времени для задачи TEST-1');
    });

    it('should handle empty array response', async () => {
      const mockWorklogs: WorklogWithUnknownFields[] = [];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorklogs);

      const result = await operation.execute('TEST-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Получение записей времени задачи TEST-1');
      expect(mockLogger.info).toHaveBeenCalledWith('Получено 0 записей времени для задачи TEST-1');
    });
  });

  describe('executeMany', () => {
    it('should get worklogs for multiple issues in parallel', async () => {
      const mockWorklogs1: WorklogWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
          issue: {
            id: 'abc123',
            key: 'TEST-1',
            display: 'Test issue',
          },
          createdBy: {
            self: 'https://api.tracker.yandex.net/v2/users/1',
            id: '1',
            display: 'User 1',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
          start: '2025-01-18T09:00:00.000+0000',
          duration: 'PT1H30M',
        },
      ];

      const mockWorklogs2: WorklogWithUnknownFields[] = [
        {
          id: '2',
          self: 'https://api.tracker.yandex.net/v2/issues/TEST-2/worklog/2',
          issue: {
            id: 'xyz456',
            key: 'TEST-2',
            display: 'Another test issue',
          },
          createdBy: {
            self: 'https://api.tracker.yandex.net/v2/users/2',
            id: '2',
            display: 'User 2',
          },
          createdAt: '2025-01-18T11:00:00.000+0000',
          start: '2025-01-18T10:00:00.000+0000',
          duration: 'PT2H',
        },
      ];

      vi.mocked(mockHttpClient.get)
        .mockResolvedValueOnce(mockWorklogs1)
        .mockResolvedValueOnce(mockWorklogs2);

      const results = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        status: 'fulfilled',
        key: 'TEST-1',
        index: 0,
        value: mockWorklogs1,
      });
      expect(results[1]).toEqual({
        status: 'fulfilled',
        key: 'TEST-2',
        index: 1,
        value: mockWorklogs2,
      });
    });

    it('should handle partial failures', async () => {
      const mockWorklogs1: WorklogWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
          issue: {
            id: 'abc123',
            key: 'TEST-1',
            display: 'Test issue',
          },
          createdBy: {
            self: 'https://api.tracker.yandex.net/v2/users/1',
            id: '1',
            display: 'User 1',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
          start: '2025-01-18T09:00:00.000+0000',
          duration: 'PT1H',
        },
      ];

      const error = new Error('API Error for TEST-2');

      vi.mocked(mockHttpClient.get)
        .mockResolvedValueOnce(mockWorklogs1)
        .mockRejectedValueOnce(error);

      const results = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[0].key).toBe('TEST-1');
      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toEqual(mockWorklogs1);
      }
      expect(results[1].status).toBe('rejected');
      expect(results[1].key).toBe('TEST-2');
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toBe('API Error for TEST-2');
      }
    });

    it('should return empty array for empty input', async () => {
      const results = await operation.executeMany([]);

      expect(results).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'GetWorklogsOperation: пустой массив идентификаторов'
      );
    });

    it('should log batch operation info', async () => {
      const mockWorklogs: WorklogWithUnknownFields[] = [
        {
          id: '1',
          self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
          issue: {
            id: 'abc123',
            key: 'TEST-1',
            display: 'Test issue',
          },
          createdBy: {
            self: 'https://api.tracker.yandex.net/v2/users/1',
            id: '1',
            display: 'User 1',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
          start: '2025-01-18T09:00:00.000+0000',
          duration: 'PT1H',
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockWorklogs);

      await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение записей времени для 2 задач параллельно: TEST-1, TEST-2'
      );
    });
  });
});

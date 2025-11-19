import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { WorklogWithUnknownFields } from '@tracker_api/entities/index.js';
import { GetWorklogsOperation } from '@tracker_api/api_operations/worklog/get-worklogs.operation.js';

describe('GetWorklogsOperation', () => {
  let operation: GetWorklogsOperation;
  let mockHttpClient: HttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new GetWorklogsOperation(mockHttpClient, mockCacheManager, mockLogger);
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
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { AddWorklogInput } from '#tracker_api/dto/index.js';
import type { ServerConfig } from '#config';
import { AddWorklogOperation } from '#tracker_api/api_operations/worklog/add-worklog.operation.js';

describe('AddWorklogOperation', () => {
  let operation: AddWorklogOperation;
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

    operation = new AddWorklogOperation(mockHttpClient, mockCacheManager, mockLogger, mockConfig);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct endpoint and data (ISO duration)', async () => {
      const input: AddWorklogInput = {
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
        comment: 'Работал над реализацией',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '123',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/123',
        issue: {
          id: 'abc123',
          key: 'TEST-1',
          display: 'Test issue',
        },
        comment: 'Работал над реализацией',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T10:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockWorklog);

      const result = await operation.execute('TEST-1', input);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/issues/TEST-1/worklog', {
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
        comment: 'Работал над реализацией',
      });
      expect(result).toEqual(mockWorklog);
    });

    it('should convert human-readable duration to ISO format', async () => {
      const input: AddWorklogInput = {
        start: '2025-01-18T10:00:00.000+0000',
        duration: '1h 30m',
        comment: 'Тестирование',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '456',
        self: 'https://api.tracker.yandex.net/v2/issues/PROJ-10/worklog/456',
        issue: {
          id: 'xyz456',
          key: 'PROJ-10',
          display: 'Project task',
        },
        comment: 'Тестирование',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/2',
          id: '2',
          display: 'User Two',
        },
        createdAt: '2025-01-18T11:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockWorklog);

      const result = await operation.execute('PROJ-10', input);

      // Проверяем, что duration был конвертирован
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/issues/PROJ-10/worklog', {
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
        comment: 'Тестирование',
      });
      expect(result.duration).toBe('PT1H30M');
    });

    it('should add worklog without comment', async () => {
      const input: AddWorklogInput = {
        start: '2025-01-18T14:00:00.000+0000',
        duration: 'PT2H',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '789',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-2/worklog/789',
        issue: {
          id: 'def789',
          key: 'TEST-2',
          display: 'Another task',
        },
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/3',
          id: '3',
          display: 'User Three',
        },
        createdAt: '2025-01-18T14:00:00.000+0000',
        start: '2025-01-18T14:00:00.000+0000',
        duration: 'PT2H',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockWorklog);

      const result = await operation.execute('TEST-2', input);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/issues/TEST-2/worklog', {
        start: '2025-01-18T14:00:00.000+0000',
        duration: 'PT2H',
      });
      expect(result.comment).toBeUndefined();
    });

    it('should handle various human-readable duration formats', async () => {
      const testCases = [
        { input: '1h', expected: 'PT1H' },
        { input: '30m', expected: 'PT30M' },
        { input: '2h 15m', expected: 'PT2H15M' },
      ];

      for (const testCase of testCases) {
        const input: AddWorklogInput = {
          start: '2025-01-18T10:00:00.000+0000',
          duration: testCase.input,
        };

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
            display: 'User',
          },
          createdAt: '2025-01-18T10:00:00.000+0000',
          start: '2025-01-18T10:00:00.000+0000',
          duration: testCase.expected,
        };

        vi.mocked(mockHttpClient.post).mockResolvedValue(mockWorklog);

        await operation.execute('TEST-1', input);

        expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/issues/TEST-1/worklog', {
          start: '2025-01-18T10:00:00.000+0000',
          duration: testCase.expected,
        });

        vi.clearAllMocks();
      }
    });

    it('should handle API errors', async () => {
      const input: AddWorklogInput = {
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H',
      };

      const error = new Error('API Error');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(operation.execute('TEST-1', input)).rejects.toThrow('API Error');
    });

    it('should log info and debug messages', async () => {
      const input: AddWorklogInput = {
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
        comment: 'Test worklog',
      };

      const mockWorklog: WorklogWithUnknownFields = {
        id: '999',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-3/worklog/999',
        issue: {
          id: 'ghi012',
          key: 'TEST-3',
          display: 'Test task',
        },
        comment: 'Test worklog',
        createdBy: {
          self: 'https://api.tracker.yandex.net/v2/users/1',
          id: '1',
          display: 'Test User',
        },
        createdAt: '2025-01-18T12:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockWorklog);

      await operation.execute('TEST-3', input);

      expect(mockLogger.info).toHaveBeenCalledWith('Добавление записи времени к задаче TEST-3');
      expect(mockLogger.debug).toHaveBeenCalledWith('Payload для API:', {
        issueId: 'TEST-3',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
        hasComment: true,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Запись времени успешно добавлена к задаче TEST-3: 999'
      );
    });
  });

  describe('executeMany', () => {
    it('should add worklogs to multiple issues with individual parameters', async () => {
      const worklogs = [
        {
          issueId: 'TEST-1',
          start: '2025-01-18T10:00:00.000+0000',
          duration: 'PT1H',
          comment: 'Work 1',
        },
        { issueId: 'TEST-2', start: '2025-01-18T11:00:00.000+0000', duration: 'PT2H' },
      ];

      const mockWorklog1: WorklogWithUnknownFields = {
        id: '1',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
        issue: { id: 'abc', key: 'TEST-1', display: 'Task 1' },
        comment: 'Work 1',
        createdBy: { self: '', id: '1', display: 'User 1' },
        createdAt: '2025-01-18T10:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H',
      };

      const mockWorklog2: WorklogWithUnknownFields = {
        id: '2',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-2/worklog/2',
        issue: { id: 'def', key: 'TEST-2', display: 'Task 2' },
        createdBy: { self: '', id: '2', display: 'User 2' },
        createdAt: '2025-01-18T11:00:00.000+0000',
        start: '2025-01-18T11:00:00.000+0000',
        duration: 'PT2H',
      };

      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce(mockWorklog1)
        .mockResolvedValueOnce(mockWorklog2);

      const result = await operation.executeMany(worklogs);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[0].key).toBe('TEST-1');
      if (result[0].status === 'fulfilled') {
        expect(result[0].value).toEqual(mockWorklog1);
      }
      expect(result[1].status).toBe('fulfilled');
      expect(result[1].key).toBe('TEST-2');
      if (result[1].status === 'fulfilled') {
        expect(result[1].value).toEqual(mockWorklog2);
      }
    });

    it('should handle partial failures when adding worklogs', async () => {
      const worklogs = [
        { issueId: 'TEST-1', start: '2025-01-18T10:00:00.000+0000', duration: 'PT1H' },
        { issueId: 'TEST-2', start: '2025-01-18T11:00:00.000+0000', duration: 'PT2H' },
      ];

      const mockWorklog: WorklogWithUnknownFields = {
        id: '1',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
        issue: { id: 'abc', key: 'TEST-1', display: 'Task 1' },
        createdBy: { self: '', id: '1', display: 'User 1' },
        createdAt: '2025-01-18T10:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H',
      };

      vi.mocked(mockHttpClient.post)
        .mockResolvedValueOnce(mockWorklog)
        .mockRejectedValueOnce(new Error('Not found'));

      const result = await operation.executeMany(worklogs);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[0].key).toBe('TEST-1');
      expect(result[1].status).toBe('rejected');
      expect(result[1].key).toBe('TEST-2');
      if (result[1].status === 'rejected') {
        expect(result[1].reason.message).toBe('Not found');
      }
    });

    it('should return empty result for empty worklogs array', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should log batch operation', async () => {
      const worklogs = [
        { issueId: 'TEST-1', start: '2025-01-18T10:00:00.000+0000', duration: 'PT1H' },
        { issueId: 'TEST-2', start: '2025-01-18T11:00:00.000+0000', duration: 'PT2H' },
      ];

      const mockWorklog: WorklogWithUnknownFields = {
        id: '1',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
        issue: { id: 'abc', key: 'TEST-1', display: 'Task 1' },
        createdBy: { self: '', id: '1', display: 'User 1' },
        createdAt: '2025-01-18T10:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockWorklog);

      await operation.executeMany(worklogs);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление записей времени к 2 задачам параллельно: TEST-1, TEST-2'
      );
    });

    it('should convert human-readable duration to ISO format in batch', async () => {
      const worklogs = [
        { issueId: 'TEST-1', start: '2025-01-18T10:00:00.000+0000', duration: '1h 30m' },
      ];

      const mockWorklog: WorklogWithUnknownFields = {
        id: '1',
        self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/1',
        issue: { id: 'abc', key: 'TEST-1', display: 'Task 1' },
        createdBy: { self: '', id: '1', display: 'User 1' },
        createdAt: '2025-01-18T10:00:00.000+0000',
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockWorklog);

      await operation.executeMany(worklogs);

      // Duration should be converted from "1h 30m" to "PT1H30M"
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/issues/TEST-1/worklog', {
        start: '2025-01-18T10:00:00.000+0000',
        duration: 'PT1H30M',
        comment: undefined,
      });
    });
  });
});
